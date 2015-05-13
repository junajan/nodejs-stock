var serverStatus = require("../modules/serverStatus")();

var Stock = require("../mongoose/stock");
var StockList = require("../mongoose/stockList");
var log = require("./log")(true, false, "MarketClient");
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
    var self = this;
    var SOCKET = null;
    var stockInfo = {};
    var TestOrders = false;
    var READ_STOCK_INTERVAL = 60000; // interval pro nacitani informaci o akcicih
    self.readInterval = 0;

    Events.on("disconnected", function() {

        clearInterval(self.readInterval);
    });

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
        SOCKET = socket;
        self.authenticate(socket);
    };

    this.authenticate = function(socket) {

        function authenticated(data) {

            serverStatus.set("authenticated", false);
            if (!data.res)
                return log.error("Error while authenticating".red);

            if (data.res == "bad_credentials")
                return log.error("Bad credentials for MarketAPI".red);

            if (data.res == "authenticated") {

                serverStatus.set("authenticated", true);
                Events.emit("serverChange");

                log.success("Authentication was successful");

                clearTimeout(self.readInterval);
                self.readStocks();
                return true;
            }

            return log.error("Authentication - undefined error: ", data);
        }

        log.message("Authenticating broker to server".yellow);
        var data = app.get("config").market_credentials;
        socket.emit("authenticate", data, authenticated);
    };

    this.saveActualStockList = function(res) {
        async.series([
            StockList.markOld,
            function(done) {
                StockList.create(res, done);
            },
            StockList.dropOld
        ]);
    };

    this.readStocks = function() {

        SOCKET.emit("getStockInfo", {}, function(res) {
            if (res.error)
                return log.error("Can't read new stock list");

            stockInfo = res.stockList;
            self.saveActualStockList(stockInfo);

            self.readInterval = setTimeout(self.readStocks, READ_STOCK_INTERVAL);
        });
    };

    this.getStocks = function() {

        return stockInfo;
    };

    this.getStocksByTicker = function(t) {

        for (s in stockInfo) {
            if (stockInfo[s].ticker == t)
                return stockInfo[s];
        }
        return false;
    };

    this.onMsg = function(data, cb, socket) {

        console.log("MSG EVENT");
        console.dir(data);
    };

    this.sendMsg = function(data, cb) {

        SOCKET.emit("msg", data, cb);
    };

    this.sendOrder = function(info, cb) {

        var data = {
            type: info.type,
            stockId: info.stock,
            price: info.price,
            amount: info.amount
        };
        
        console.log(" >> Posilam obchodni prikaz: " + JSON.stringify(data));
        SOCKET.emit("setOrder", data, cb);
    };

    this.addBuyOrder = function(info, cb) {

        if (!serverStatus.get("authenticated"))
            return cb("Připojení s burzou není aktivní. Vyčkejte nejprve na spojení.", false);

        log.message("Processing clients buy order".yellow);
        delete info.priceSum;

        info.originalAmount = info.amount;

        // zapis do DB
        Order(info).save(function(err, data) {

            if (err)
                return cb(err, data);

            // odesli na server
            self.sendOrder(info, function(r) {
                if (r && r.id) {
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
                    return;
                }

                if (!r || !r.error)
                    r = {
                        error: "Burza odeslala chybný response"
                    };

                // invalidate order
                Order.invalidate(data._id);

                return cb(r.error, data);
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
                if (r && r.id) {
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
                    return;
                }

                if (!r || !r.error)
                    r = {
                        error: "Burza odeslala chybný response"
                    };

                return cb(r.error, null);
            });
        });
    };

    this.addSellOrder = function(info, stockRemove, cb) {

        if (!serverStatus.get("authenticated"))
            return cb("Připojení s burzou není aktivní. Vyčkejte nejprve na spojení.", false);

        log.message("Processing clients sell order".yellow);
        delete info.priceSum;
        delete info.priceSumValue;

        async.each(stockRemove,
            function(o, done) {
                // snizime pocet vlastnenych akcii
                ClientStock.update({
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

    this.cancelOrder = function(info, cb) {

        if (!serverStatus.get("authenticated"))
            return cb("Spojení s burzou není aktivní. Vyčkejte nejprve na jeho obnovení.", false);

        log.message("Processing clients cancel order".yellow);


        // zapis do DB
        Order.cancel(info.id, function(err, data) {

            if (err)
                return cb(err, data);

            console.log("Posílam prikaz na zrušení " + JSON.stringify(info));
            SOCKET.emit("cancelOrder", {
                orderId: info.orderId
            }, function(res) {
                if (!res)
                    res = {};

                if (res.result && res.result == 'accepted')
                    return cb(null, info);

                Order.uncancel(info.id);

                if (res.error)
                    return cb("Burza: " + res.error);

                cb("Market sent undefined error for cancel order", res);
            });
        });
    };

    this.orderCancelled = function(data, cb, socket) {

        console.log("Market sent cancelled result for order .".yellow, data.orderId);

        Order.findOne({
            orderId: data.orderId,
            cancelled: 0,
            cancelOrder: 1
        }, function(err, item) {

            if (!item) {
                log.error("Market zaslal potvrzení o zrušení na neznámý příkaz.");
                return cb(true);
            }

            // pokud je to BUY vratime zpatky vlozene penize
            if (item.type == 1) {
                console.log("Vracim klientovi penize po zruseni poptavaciho prikazu.");

                var cashBack = parseFloat(data.amount) * parseFloat(item.price);
                Client.update({
                    _id: item.client
                }, {
                    $inc: {
                        accountBalance: cashBack
                    }
                }, function(err, res) {});

            } else {
                // pokud je to SELL, vratime zpatky akcie
                console.log("Vracim klientovi akcie po zruseni nabizeciho prikazu.");

                // zapis akcie klientovi
                var newStockInfo = {
                    ticker: item.ticker,
                    amount: data.amount,
                    originalAmount: item.amount,
                    client: item.client,
                    price: item.price
                };

                ClientStock(newStockInfo).save(function(err, r) {});
            }

            // item.save(function (err) {
            Order.update({
                    orderId: data.orderId
                }, {
                    $set: {
                        cancelled: 1
                    }
                },
                function(err, res) {

                    if (err) {
                        console.error('Error while saving data!');
                        cb(false);
                    }

                    var histData = {
                        type: item.type + 300, // 0 -> 200 = prodej zrusen | 1 -> 201 = nakup zrusen 
                        ticker: item.ticker,
                        amount: data.amount,
                        price: item.price,
                    };
                    ClientHistory.saveEvent(item.client, histData);

                    cb(true);
                });
        });
    };

    this.orderExpired = function(data, cb, socket) {


        Order.findOne({
            orderId: data.orderId,
            cancelled: 0,
            expired: 0
        }, function(err, item) {

            if (!item) {
                log.error("Market has sent expiry notification about unknown order.");
                return cb(false);
            }

            log.message("Market has sent expiry notification about order.");

            if (item.type == 1) {
                log.event("Vracim klientovi penize po expiraci poptavaciho prikazu.");

                var cashBack = parseFloat(data.amount) * parseFloat(item.price);
                Client.incBalance(item.client, cashBack, function(err, res) {});

            } else {
                console.log("Vracim klientovi akcie po expiraci nabizeciho prikazu.");

                // zapis akcie klientovi
                var newStockInfo = {
                    ticker: item.ticker,
                    amount: data.amount,
                    originalAmount: item.amount,
                    client: item.client,
                    price: item.price
                };

                ClientStock(newStockInfo).save(function(err, r) {});
            }

            item.expired = 1;
            Order.expire(item.orderId, function(err, res) {

                if (err) {
                    console.error('Error while saving data!');
                    cb(false);
                }

                var histData = {
                    type: item.type + 400, // vyexpirovano
                    ticker: item.ticker,
                    amount: data.amount,
                    price: item.price,
                };

                ClientHistory.saveEvent(item.client, histData);
                cb(true);
            });
        });
    };

    this.updatedStockList = function(data) {
        stockInfo = data.stockList;
        self.saveActualStockList(stockInfo);
    };

    this.getClientStocks = function(uid, cb) {
        ClientStock.find({
            client: uid,
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
            cancelled: 0,
            expired: 0,
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
        log.message(("Order " + data.orderId + " was processed.").yellow);

        Order.findOne({
            orderId: data.orderId,
            expired: 0,
            cancelled: 0
        }, function(err, order) {

            if (err || !order) {
                console.log("Unknown order!".red);
                return cb(false);
            }

            order.ackDate = Date(data.strikeTime);
            order.filledAmount += data.amount;
            order.tradedPrice = parseFloat(data.price);
            var money = data.amount * order.tradedPrice;

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
                        ticker: order.ticker,
                        amount: data.amount,
                        price: order.tradedPrice,
                    };
                    ClientHistory.saveEvent(order.client, histData);

                    // buy
                    if (order.type == 1) {
                        console.log("Accepting order result");

                        // zapis akcie klientovi
                        var newStockInfo = {
                            ticker: order.ticker,
                            amount: data.amount,
                            originalAmount: data.amount,
                            client: order.client,
                            price: order.tradedPrice
                        };

                        ClientStock(newStockInfo).save(function(err, r) {
                            if (err)
                                return cb("Při připisování akcií došlo k chybě.");
                            return cb(true);
                        });
                    }
                    // sell
                    else
                        Client.incBalance(order.client, money, function(err, res) {
                            cb(!!err);
                        });

                });
        });
    };

    this.loadInitStockList = function() {

        StockList.find({
            old: 0
        }, function(err, res) {

            if (!err && Object.keys(stockInfo).length === 0) {

                for (var i in res)
                    stockInfo[res[i].ticker] = res[i];
            }
        });
    };

    this.init = function() {
        self.loadInitStockList();
    };

    self.init();
    return this;
};

MarketClient.instance = null;
module.exports = function(app) {

    if (!MarketClient.instance)
        MarketClient.instance = new MarketClient(app);

    return MarketClient.instance;
};
