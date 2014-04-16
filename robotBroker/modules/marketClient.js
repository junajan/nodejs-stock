var serverStatus = require("../modules/serverStatus")();

var Stock = require("../mongoose/stock");
var StockList = require("../mongoose/stockList");
var log = require("./log")(true, true, "MarketClient");
var async = require("async");
var http = require("http");
var _ = require("underscore");
var Order = require("../mongoose/order");
var MyStock = require("../mongoose/mystock");
var History = require("../mongoose/history");

var Events = require("./events");


var MarketClient = function(app) {
    console.log("Loading ROBOT API");

    var SOCKET = null;
    var ROBOT = this;
    var stockInfo = {};

    var TestOrders = false;
    
    var ROBOT_UI = require("./robotUi")( app, this );


    Events.on("disconnected", function() {

        clearInterval(ROBOT.readStocksInterval);
    });

    this.call = function(f, evName, socket) {
        return function(d, cb) {

            log.event(evName, d);

            if (_.isFunction(d)) {
                cb = d;
                d = null;
            }

            if (!_.isFunction(cb))
                cb = function() {}

            if (_.isFunction(f))
                f(d, cb, socket, evName);
        }
    }

    this.onConnectedToServer = function(data, cb, socket) {

        console.log("Connected to sock server".green);
        SOCKET = socket;
        ROBOT.authenticate(socket);
    }

    this.authenticate = function(socket) {

        console.log("Authenticating ROBOT to server".yellow);

        var data = app.get("config").market_credentials;
        data.name = app.get("config").robot_name;

        socket.emit("authenticate", data, ROBOT.authenticated);
    }

    this.authenticated = function(data) {

        serverStatus.set("authenticated", false);
        if (!data.res)
            return console.log("Error while authenticating".red);

        if (data.res == "bad_credentials")
            return console.log("Bad credentials".red);

        if (data.res == "authenticated") {

            serverStatus.set("authenticated", true);
            Events.emit("serverChange");

            console.log("Authentication was successful".green);

            clearInterval(ROBOT.readStocksInterval);
            ROBOT.readStocks();
            ROBOT.readStocksInterval = setInterval( ROBOT.readStocks, 1000 );

            return true;
        }

        return console.log(("Authentication - undefined error: " + JSON.stringify(data)).red);
    }

    this.readStocks = function() {

        log.message("Reading stock data");
        SOCKET.emit("getStockInfo", {}, function(res) {

            stockInfo = res;
        });
    }

    this.getStocks = function() {

        return stockInfo;
    }

    this.onMsg = function(data, cb, socket) {

        console.log("MSG EVENT");
        console.dir(data);
    }

    this.sendMsg = function(data, cb) {

        SOCKET.emit("msg", data, cb);
    }

    this.sendOrder = function(info, cb) {

        var data = {
            type: info.type,
            code: info.code,
            price: info.price,
            type: info.type,
            amount: info.amount
        }

        console.dir(data);
        SOCKET.emit("setOrder", data, cb);
    }

    this.addBuyOrder = function(info, cb) {

        log.message("Processing buy order".yellow);
        delete info.priceSum;

        info.originalAmount = info.amount;
        
        // zapis do DB
        Order(info).save(function(err, data) {

            if (err)
                return cb(err, data);

            // odesli na server
            ROBOT.sendOrder(info, function(r) {

                if (r) {

                    if (r.id) {

                        // console.log ( "Updating order stock_id")
                        Order.update({ _id: data._id }, { $set: { stock_id: r.id } }, function(err, r) {

                            if (err)
                                return cb(err);

                            cb(null, 1);
                        });

                        return;

                    } else if (r.error) {

                        log.message("Invalidating order ID: " + data._id );
                        Order.update({ _id: data._id }, { $set: { invalid: Date.now() } }, function() {});
                        return cb(r.error, data);
                    }
                }

                return cb("Undefined error", data);
            })
        });
    }

    this.createAndSendSellOrder = function ( info, cb ) {

        info.originalAmount = info.amount;
        
        // zapis prikaz do databaze
        Order(info).save(function(err, data) {

            if (err)
                return cb(err, data);

            // odesli na server
            ROBOT.sendOrder(info, function(r) {

                if (r) {

                    if (r.id) {

                        // console.log ( "Updating order stock_id")
                        Order.update({ _id: data._id }, { $set: { stock_id: r.id } }, function(err, r) {
                            if (err)
                                return cb(err);

                            cb(null, 1);
                        });

                    } else if (r.error)
                        cb(r.error, data);

                    return;
                }

                return cb("Undefined error", data);
            })
        });
    }


    this.addSellOrder = function(info, stockRemove, cb) {

        log.message("Processing sell order".yellow);
        delete info.priceSum;
        delete info.priceSumValue;

        async.each(stockRemove, 
            function ( o, done ) {

                // return done ( false );
                
                // snizime pocet vlastnenych akcii
                MyStock.update({ _id: o[0] }, { $inc: { amount: -1 * o[1] }}, done);
            }, 
            function(err){

                if ( err ) {

                    cb ( "Při odečítání akcií došlo k chybě!" );
                    return log.error( "Chyba při odečítání akcií u klienta!")
                }
                
                ROBOT.createAndSendSellOrder ( info, cb );
        });
    }

    this.sellStock = function ( info, resCb ) {
        
        // doplni typ prikazu je 0 - sell
        info.type = 0;

        // test, zda se jedna o existujici spolecnost        
        var stocks = this.getStocks ();

        // otestuje, zda se obchoduje s existujici spolecnosti
        if ( ! stocks[info.code] )
            return res.send ({error:"Bad stock code!"});
        
        // hledame klientovi akcie, kde je volne mnozstvi vice jak 0
        MyStock
            .find({ amount: { $gt: 0 }, code: info.code })
            .sort({'date': -1})
            .exec(function(err, u){

            // test zda ma uzivatel dost akcii, aby je mohl prodat
            var stockRemove = [];

            // vytvorime seznam klientovych akcii, ktere muzeme odecist
            var amountLeft = info.amount;
            if ( u.length ) for ( i in u ) {

                stockRemove.push ( [ u[i]._id, Math.min(amountLeft, u[i].amount) ] );
                amountLeft -= u[i].amount;

                // pokud mame dost akcii, aby pokryly prikaz na prodej, ukoncime cyklus
                if ( amountLeft <= 0 ) 
                    break;
            }

            // pokud klient nema dostatek kusu akcii na prodej, vyhodime chybu
            if ( amountLeft > 0 )
                return resCb ( "Nedostatečné prostředky pro realizaci příkazu!");

            // odesle sell prikaz
            ROBOT.addSellOrder ( info, stockRemove, function ( err, out ) {

                // pokud doslo k chybe, zaloguj a vrat chybu
                if ( err ) {

                    console.log ( err.toString().red );
                    return resCb ( err.toString(), { valid: 0, error: err.toString() });
                }

                // odesli vysledek prikazu
                resCb (null, { valid: 1});

                // sestav data s infem pro ulozeni do historie prikazu
                var histData = {
                    type: info.type,
                    code: info.code,
                    price: info.price,
                    amount: info.amount,
                    notifyDate: Date.now()
                }

                // uloz prikaz do historie
                History.saveEvent ( histData );
            });
        });      
    }


    this.priceChanged = function ( data ) {

        if ( data.data )
            for ( i in data.data ) 
                if ( stockInfo[i] ) 
                    stockInfo[i].price = data.data[i];
    }

    this.getMyStocks = function(uid, cb) {

        MyStock.find({
            amount: { $gt: 0 }
        }, cb);
    }

    /**
     * Vrati klientovy nedo            if ( ! o.amount )
                continue;
koncene objednavky
     * - vybere z databaze ty, ktere maji dokoncene mnozstvi mensi jak mnozstvi objednavky
     * - tj vezme i castecne dokoncene transakce
     * @param  {Number}   uid ID klienta
     * @param  {Function} cb  Callback funkce
     */
    this.getClientsOrders = function(uid, cb) {

        Order.find( { client: uid, invalid: null, $where : "this.filledAmount < this.amount "}, cb );
    }

    this.getStatus = function(req, res) {

        res.send(serverStatus.getData());
    }

    this.getServerStatusInfo = function () {

        return {
            "connected": serverStatus.get("authenticated")
        }
    }

    this.orderProcessed = function(data, cb) {

        log.message("Order " + data.order_id + " was processed.".yellow);
        Order.findOne({stock_id: data.order_id}, function ( err, order ) {

            if ( err ) 
                return cb ( false );

            if ( ! order ) {

                console.log ("Unknown order!".blue );
                return cb ( false );
            }

            order.ackDate = data.sendDate;
            order.filledAmount += data.processed_amount;
            order.tradedPrice = data.price;

            var money = order.amount * order.tradedPrice;

            order.save ( function ( err, res ) {

                if ( err )
                    return cb ( false );
                
                var histData = {
                    type: order.type + 100,   // 0 -> 100 = nakoupeno | 1 -> 101 = prodano 
                    code: order.code,
                    amount: data.processed_amount,
                    price: order.tradedPrice,
                }
                History.saveEvent ( histData );

                // buy
                if ( order.type == 1 ) {
                    console.log ( "Accepting order result" );
                    
                    // zapis akcie klientovi
                    var newStockInfo = {
                        code: order.code,
                        amount: data.processed_amount,
                        originalAmount: data.processed_amount,
                        client: order.client,
                        price: order.tradedPrice
                    }
                   
                    MyStock ( newStockInfo ).save ( function ( err, r ) {

                        if ( err )
                            return cb ( "Při připisování akcií došlo k chybě." );

                        return cb ( true );
                    });
                }

                // sell
                // else 

                    // Client.update({ _id: order.client }, { $inc: { accountBalance: money }}, function( err, res ) {

                    //     if ( err )
                    //         return cb ( false );

                    //     cb ( true );
                    // });
            });
        });
    }
    return this;
}


MarketClient.instance = null;
module.exports = function(app) {

    if (!MarketClient.instance)
        MarketClient.instance = new MarketClient(app);

    return MarketClient.instance;
}