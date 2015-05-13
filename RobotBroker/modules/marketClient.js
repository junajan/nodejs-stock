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
    var self = this;
    var stockInfo = {};
    var TestOrders = false;

    var ROBOT_UI = this.ROBOT_UI = require("./robotUI")(app, this);


    Events.on("disconnected", function() {});

    this.call = function(f, evName, socket) {
        return function(d, cb) {

            log.event(evName, d);

            if (_.isFunction(d)) {
                cb = d;
                d = null;
            }

            if (!_.isFunction(cb))
                cb = function() {};

            if (_.isFunction(f))
                f(d, cb, socket, evName);
        };
    };

    this.onConnectedToServer = function(data, cb, socket) {

        console.log("Connected to sock server".green);
        SOCKET = socket;
        self.authenticate(socket);
    };

    this.authenticate = function(socket) {

        console.log("Authenticating ROBOT to server".yellow);
        socket.emit("authenticate", app.get("config").market_credentials, self.authenticated);
    };

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

            self.readStocks();
            return true;
        }

        return console.log(("Authentication - undefined error: " + JSON.stringify(data)).red);
    };

    this.readStocks = function() {

        // log.message("Reading stock data");
        SOCKET.emit("getStockInfo", {}, self.updatedStockList);
    };

    this.getStocks = function() {

        return stockInfo;
    };

    this.onMsg = function(data, cb, socket) {

        // console.log("MSG EVENT");
        // console.dir(data);
    };

    this.sendMsg = function(data, cb) {

        SOCKET.emit("msg", data, cb);
    };

    this.sendOrder = function(info, cb) {

        var data = {
            type: info.type,
            stockId: stockInfo[info.code].id,
            price: info.price,
            amount: info.amount,
        };
        SOCKET.emit("setOrder", data, cb);
    };

    this.addBuyOrder = function(info, cb) {

        // log.message("Processing buy order".yellow);
        delete info.priceSum;

        if (!stockInfo[info.code])
            return cb("Stock is not on stock marker");

        info.originalAmount = info.amount;
        info.type = 1;

        // zapis do DB
        Order(info).save(function(err, data) {

            if (err)
                return cb(err, data);

            // odesli na server
            self.sendOrder(info, function(r) {

                if (r) {

                    if (r.id) {

                        // console.log ( "Updating order orderId")
                        Order.update({
                            _id: data._id
                        }, {
                            $set: {
                                orderId: r.id
                            }
                        }, function(err, r) {

                            if (err)
                                return cb(err);

                            cb(null, data._id);
                        });

                        return;

                    } else if (r.error) {

                        log.message("Invalidating order ID: " + data._id);
                        Order.update({
                            _id: data._id
                        }, {
                            $set: {
                                invalid: Date.now()
                            }
                        }, function() {});
                        return cb(r.error, data);
                    }
                }

                return cb("Undefined error", data);
            });
        });
    };

    this.createAndSendSellOrder = function(info, cb) {

        info.originalAmount = info.amount;

        // zapis prikaz do databaze
        Order(info).save(function(err, data) {

            if (err)
                return cb(err, data);

            // odesli na server
            self.sendOrder(info, function(r) {

                if (r) {

                    if (r.id) {

                        // console.log ( "Updating order orderId")
                        Order.update({
                            _id: data._id
                        }, {
                            $set: {
                                orderId: r.id
                            }
                        }, function(err, r) {
                            if (err)
                                return cb(err);

                            cb(null, 1);
                        });

                    } else if (r.error)
                        cb(r.error, data);

                    return;
                }

                return cb("Undefined error", data);
            });
        });
    };

    this.addSellOrder = function(info, stockRemove, cb) {

        // log.message("Processing sell order".yellow);
        delete info.priceSum;
        delete info.priceSumValue;

        async.each(stockRemove, function(o, done) {

                // snizime pocet vlastnenych akcii
                MyStock.update({
                    _id: o[0]
                }, {
                    $inc: {
                        amount: -1 * o[1]
                    }
                }, done);
            },
            function(err) {

                if (err) {

                    cb("Při odečítání akcií došlo k chybě!");
                    return log.error("Chyba při odečítání akcií u klienta!");
                }

                self.createAndSendSellOrder(info, cb);
            });
    };

    this.sellStock = function(info, resCb) {

        // doplni typ prikazu je 0 - sell
        info.type = 0;

        // test, zda se jedna o existujici spolecnost        
        var stocks = this.getStocks();

        // otestuje, zda se obchoduje s existujici spolecnosti
        if (!stocks[info.code])
            return resCb("Bad stock code!");

        // hledame klientovi akcie, kde je volne mnozstvi vice jak 0
        MyStock
            .find({
                amount: {
                    $gt: 0
                },
                code: info.code
            })
            .sort({
                'date': -1
            })
            .exec(function(err, u) {

                // test zda ma uzivatel dost akcii, aby je mohl prodat
                var stockRemove = [];

                // vytvorime seznam klientovych akcii, ktere muzeme odecist
                var amountLeft = info.amount;
                if (u.length)
                    for (var i in u) {

                        stockRemove.push([u[i]._id, Math.min(amountLeft, u[i].amount)]);
                        amountLeft -= u[i].amount;

                        // pokud mame dost akcii, aby pokryly prikaz na prodej, ukoncime cyklus
                        if (amountLeft <= 0)
                            break;
                    }

                // pokud klient nema dostatek kusu akcii na prodej, vyhodime chybu
                if (amountLeft > 0)
                    return resCb("Nedostatečné prostředky pro realizaci příkazu!");

                // odesle sell prikaz
                self.addSellOrder(info, stockRemove, function(err, out) {

                    // pokud doslo k chybe, zaloguj a vrat chybu
                    if (err) {

                        console.log(err.toString().red);
                        return resCb(err.toString(), {
                            valid: 0,
                            error: err.toString()
                        });
                    }

                    // odesli vysledek prikazu
                    resCb(null, {
                        valid: 1
                    });
                });
            });
    };

    this.updatedStockList = function(data) {
        data.stockList.forEach(function(i) {
            i.code = i.ticker;
            i.price = parseFloat(i.price);

            stockInfo[i.ticker] = i;
        });
    };

    this.getMyStocks = function(uid, cb) {
        MyStock.find({
            amount: {
                $gt: 0
            }
        }, cb);
    };

    /**
     * Vrati klientovy nedokoncene objednavky
     * - vybere z databaze ty, ktere maji dokoncene mnozstvi mensi jak mnozstvi objednavky
     * - tj vezme i castecne dokoncene transakce
     * @param  {Number}   uid ID klienta
     * @param  {Function} cb  Callback funkce
     */
    this.getClientsOrders = function(uid, cb) {

        Order.find({
            client: uid,
            invalid: null,
            $where: "this.filledAmount < this.amount "
        }, cb);
    };

    this.getStatus = function(req, res) {

        res.send(serverStatus.getData());
    };

    this.getServerStatusInfo = function() {

        return {
            "connected": serverStatus.get("authenticated")
        };
    };

    this.orderProcessed = function(data, cb) {

        // log.message("Order " + data.orderId + " was processed.".yellow);
        Order.findOne({
            orderId: data.orderId,
            expired: 0,
            cancelled: 0
        }, function(err, order) {

            if (err)
                return cb(false);

            if (!order) {
                console.log("Unknown order!".red);
                return cb(true);
            }

            if (!order.code)
                return false;

            order.ackDate = Date.now();
            order.filledAmount += data.amount;
            order.tradedPrice = data.price;

            var money = order.amount * order.tradedPrice;

            //order.save ( function ( err, res ) {
            Order.update({
                    orderId: data.orderId
                }, {
                    $inc: {
                        filledAmount: data.amount
                    },
                    $set: {
                        ackDate: Date.now(),
                        tradedPrice: order.tradedPrice
                    }
                },
                function(err, res) {

                    if (err)
                        return cb(false);

                    var histData = {
                        type: order.type + 100, // 0 -> 100 = nakoupeno | 1 -> 101 = prodano 
                        code: order.code,
                        amount: data.amount,
                        price: order.tradedPrice,
                        item_id: data.orderId
                    };
                    History.saveEvent(histData);

                    // zapis akcie klientovi
                    var newStockInfo = {
                        code: order.code,
                        amount: data.amount,
                        originalAmount: data.amount,
                        price: order.tradedPrice
                    };

                    if (order.type == 1) { // buy

                        console.log("Accepting buy order result");

                        MyStock(newStockInfo).save(function(err, r) {

                            if (err)
                                return cb("Při připisování akcií došlo k chybě.");

                            console.dir(newStockInfo);
                            ROBOT_UI.buyOrderProcessed(newStockInfo);

                            return cb(true);
                        });

                    } else if (order.type == 0) { // sell

                        console.log("Accepting sell order result");
                        if (err)
                            return cb(false);

                        ROBOT_UI.sellOrderProcessed(newStockInfo);

                        return cb(true);
                    } else {

                        log.error("Unhandled result order event: " + order.type);
                        return cb(false);
                    }
                });
        });
    };

    this.orderExpired = function(data, cb, socket) {

        console.log("Market posílá informaci o vyexpirovaném příkazu.".yellow);

        Order.findOne({
            orderId: data.orderId,
            cancelled: 0,
            expired: 0
        }, function(err, item) {

            if (!item) {

                log.error("Market zaslal informaci o expiraci na neznámý příkaz.", data.orderId);
                return cb(true);
            }

            var newStockInfo = {
                code: item.code,
                amount: data.amount,
                originalAmount: item.amount,
                client: item.client,
                price: item.price
            };

            // pokud je to BUY vratime zpatky vlozene penize
            if (item.type == 1) {

                ROBOT_UI.buyOrderExpired(newStockInfo);
            } else {
                // pokud je to SELL, vratime zpatky akcie
                console.log("Vracim akcie po expiraci sell prikazu.");

                // zapis akcie klientovi
                MyStock(newStockInfo).save(function(err, r) {});
                ROBOT_UI.sellOrderExpired(newStockInfo);
            }

            Order.update({
                orderId: data.orderId
            }, {
                $set: {
                    expired: 1
                }
            }, function(err, res) {

                if (err) {
                    console.error('Error while saving data!');
                    cb(false);
                }

                var histData = {
                    type: item.type + 400, // vyexpirovano
                    code: item.code,
                    amount: data.amount,
                    price: item.price,
                    item_id: data.orderId
                };
                History.saveEvent(histData);

                cb(true);
            });
        });
    };

    return this;
};


MarketClient.instance = null;
module.exports = function(app) {

    if (!MarketClient.instance)
        MarketClient.instance = new MarketClient(app);

    return MarketClient.instance;
};