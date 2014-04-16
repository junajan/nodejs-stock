var serverStatus = require("../modules/serverStatus")();

var Stock = require("../mongoose/stock");
var StockList = require("../mongoose/stockList");
var log = require("./log")(true, true, "MarketClient");
var async = require("async");
var http = require("http");
var _ = require("underscore");
var Settings = require("../mongoose/settings");
var Order = require("../mongoose/order");
var Client = require("../mongoose/client");
var ClientStock = require("../mongoose/clientStock");
var StockList = require("../mongoose/stockList");
var ClientHistory = require("../mongoose/clientHistory");

var Events = require("./events");


var MarketClient = function(app) {
    console.log("Loading Broker API");

    var SOCKET = null;
    var BROKER = this;
    var stockInfo = {};
    var TestOrders = false;

    BROKER.readInterval = 0;
    
    Events.on("disconnected", function () {

        clearInterval( BROKER.readInterval );
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
        BROKER.authenticate(socket);
    }

    this.authenticate = function(socket) {

        console.log("Authenticating broker to server".yellow);

        var data = app.get("config").market_credentials;
        data.name = app.get("config").broker_name;

        socket.emit("authenticate", data, BROKER.authenticated);
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

            BROKER.readStocks();

            clearInterval(BROKER.readInterval);
            BROKER.readInterval = setInterval( BROKER.readStocks, 1000 );

            return true;
        }

        return console.log(("Authentication - undefined error: " + JSON.stringify(data)).red);
    }

    this.saveActualStockList = function ( res ) {

        var arr = [];

        for ( i in res ) {
            var it = res[i];
            delete it._id;
            arr.push( it );
        }
        
        StockList.markOld( function () {

            StockList.create( arr, function () {

                StockList.dropOld();   
            });
        });

    }

    this.readStocks = function() {

        log.message("Reading stock data");
        SOCKET.emit("getStockInfo", {}, function(res) {

            stockInfo = res;
            
            BROKER.saveActualStockList ( res );
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

        log.message("Processing clients buy order".yellow);
        delete info.priceSum;

        info.originalAmount = info.amount;
        
        // zapis do DB
        Order(info).save(function(err, data) {

            if (err)
                return cb(err, data);

            // odesli na server
            BROKER.sendOrder(info, function(r) {

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
                        Order.update({ _id: data._id }, { $set: { invalid: Date.now() } });
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
            BROKER.sendOrder(info, function(r) {

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

        log.message("Processing clients sell order".yellow);
        delete info.priceSum;
        delete info.priceSumValue;

        async.each(stockRemove, 
            function ( o, done ) {

                // return done ( false );
                
                // snizime pocet vlastnenych akcii
                ClientStock.update({ _id: o[0] }, { $inc: { amount: -1 * o[1] }}, done);
            }, 
            function(err){

                if ( err ) {

                    cb ( "Při odečítání akcií došlo k chybě!" );
                    return log.error( "Chyba při odečítání akcií u klienta!")
                }
                

                BROKER.createAndSendSellOrder ( info, cb );
        });
    }

    this.priceChanged = function ( data ) {

        if ( data.data )
            for ( i in data.data ) 
                if ( stockInfo[i] ) 
                    stockInfo[i].price = data.data[i];
    }

    this.getClientStocks = function(uid, cb) {

        ClientStock.find({
            client: uid,
            amount: { $gt: 0 }
        }, cb);
    }

    /**
     * Vrati klientovy nedokoncene objednavky
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
                ClientHistory.saveEvent ( order.client, histData );

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
                   
                    ClientStock ( newStockInfo ).save ( function ( err, r ) {

                        if ( err )
                            return cb ( "Při připisování akcií došlo k chybě." );

                        return cb ( true );
                    });
                }

                // sell
                else 
                    Client.update({ _id: order.client }, { $inc: { accountBalance: money }}, function( err, res ) {

                        if ( err )
                            return cb ( false );

                        cb ( true );
                    });
            });
        });
    }

    this.loadInitStockList = function () {

        StockList.find({old:0}, function( err, res ) {

            if ( ! err && Object.keys(stockInfo).length == 0 ) {

                for ( i in res ) 
                    stockInfo[ res[i].code ] = res[i];
            }
        });
    }

    this.init = function () {

        BROKER.loadInitStockList();
    }

    BROKER.init();
    return this;
}

MarketClient.instance = null;
module.exports = function(app) {

    if (!MarketClient.instance)
        MarketClient.instance = new MarketClient(app);

    return MarketClient.instance;
}