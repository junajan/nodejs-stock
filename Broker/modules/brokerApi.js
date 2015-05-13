var log = require("./log")(true, true, "BrokerApi");
var async = require("async");
var _ = require("underscore");
var Events = require("./events");

var serverStatus = require("../modules/serverStatus")();
var Stock = require("../mongoose/stock");
var StockList = require("../mongoose/stockList");
var Order = require("../mongoose/order");
var Client = require("../mongoose/client");
var ClientStock = require("../mongoose/clientStock");
var ClientHistory = require("../mongoose/clientHistory");



var BrokerApi = function(app) {
    var ClientRestApi = require("./clientApi")(app);
    var MarketApi = require("./marketClient")(app);
    var stockInfo = {};

    this.call = function(f, evName, socket) {
        return function(d, cb) {

            try {

                log.event(evName, d);

                if (_.isFunction(d)) {
                    cb = d;
                    d = null;
                }

                if (!_.isFunction(cb))
                    cb = function() {}

                if (_.isFunction(f))
                    f(d, cb, socket, evName);

            } catch (e) {

                log.message(("ERROR: " + e).red);
            }
        };
    };

    this.getClients = function(req, res) {

        Client.find({}, {
            accountBalance: true,
            name: true,
            email: true,
            updated: true,
            regDate: true
        }, function(err, data) {

            if (err)
                return res.send({});

            var keys = ClientRestApi.getConnectedClientSocketIds();
            res.send({
                clients: data,
                online: _.values(keys)
            });
        });
    };

    this.getClientDetail = function(req, res) {

        function readHistory(done) {

            ClientHistory.find({
                client: req.params.id
            }).sort({
                date: -1
            }).exec(done);
        }

        function readClientInfo(done) {

            Client.findOne({
                _id: req.params.id
            }).sort({
                date: -1
            }).exec(done);
        }

        function readClientStock(done) {

            ClientStock.find({
                amount: {
                    $gt: 0
                },
                client: req.params.id
            }, done);
        }

        function readClientPending(done) {

            Order.find({
                client: req.params.id,
                invalid: null,
                cancelled: 0,
                expired: 0,
                $where: "this.filledAmount < this.amount "
            }, done);
        }

        async.parallel([readClientInfo, readHistory, readClientStock, readClientPending], function(err, data) {

            res.send({
                info: data[0],
                history: data[1],
                owned: data[2],
                pending: data[3],
                stocks: MarketApi.getStocks()
            });
        });
    };

    this.getHistory = function(req, res) {

        function readHistory(done) {

            ClientHistory.find().sort({
                date: -1
            }).exec(done);
        }

        async.parallel([readAllClientNames, readHistory], function(err, data) {

            res.send({
                clients: data[0],
                history: data[1]
            });
        });
    };

    this.getStocks = function(req, res) {

        res.send(MarketApi.getStocks());
    };

    this.getMyStocks = function(req, res) {

        function readOwnedStocks(done) {

            ClientStock.find({
                amount: {
                    $gt: 0
                }
            }, done);
        }

        async.parallel([readAllClientNames, readOwnedStocks, ], function(err, data) {

            res.send({
                clients: data[0],
                ownedStocks: data[1],
                stocks: MarketApi.getStocks()
            });
        });
    };

    this.getStockInfo = function(req, res) {
        var stocks = MarketApi.getStocks();

        for (var s in stocks) {
            if (stocks[s].ticker == req.params.code)
                return res.send(stocks[s]);
        }

        return res.send({
            bad_code: 1
        });
    };

    this.getMyStocksDetail = function(req, res) {

        function readOwnedStocks(done) {

            ClientStock.find({
                amount: {
                    $gt: 0
                },
                code: req.params.code
            }, done);
        }

        async.parallel([readAllClientNames, readOwnedStocks, ], function(err, data) {

            res.send({
                clients: data[0],
                ownedStocks: data[1]
            });
        });
    };

    function readAllClientNames(done) {

        Client.find({}, {
            name: true
        }, done);
    }

    this.getPendingOrders = function(req, res) {
        function readPendingOrders(done) {

            Order.find({
                invalid: null,
                cancelled: 0,
                expired: 0,
                $where: "this.filledAmount < this.amount "
            }, {}, {
                sort: {
                    date: -1
                }
            }, done);
        }

        async.parallel([readAllClientNames, readPendingOrders], function(err, data) {

            res.send({
                clients: data[0],
                orders: data[1]
            });
        });
    };

    this.getClientStocks = function(uid, cb) {

        ClientStock.find({
            client: uid,
            amount: {
                $gt: 0
            }
        }, cb);
    };

    this.getClientsOrders = function(uid, cb) {

        Order.find({
            client: uid,
            invalid: null,
            cancelled: 0,
            expired: 0,
            $where: "this.filledAmount < this.amount "
        }, cb);
    };

    this.getStatus = function(req, res) {

        res.send(serverStatus.getData());
    };

    this.getServerStatusInfo = function(req, res) {

        function getClientCount(done) {

            Client.count({}, done);
        }

        function getPendingRequestsCount(done) {

            Order.count({
                invalid: null,
                cancelled: 0,
                expired: 0,
                $where: "this.filledAmount < this.amount "
            }, done);
        }

        function readOwnedStocksCount(done) {

            ClientStock.aggregate({
                    $group: {
                        _id: '$typeId',
                        amount: {
                            $sum: '$amount'
                        }
                    }
                }, {
                    $project: {
                        _id: 1,
                        amount: 1
                    }
                }, done
            );
        }

        async.parallel([
            getClientCount,
            getPendingRequestsCount,
            readOwnedStocksCount
        ], function(err, data) {

            var keys = ClientRestApi.getConnectedClientSocketIds();

            var ownedAmount = 0;
            if (data[2].length)
                ownedAmount = data[2][0].amount;

            var info = {
                connected: serverStatus.get("authenticated"),
                clientCount: data[0],
                onlineCount: _.values(keys).length,
                pendingOrdersCount: data[1],
                startTime: app.get("startTime"),
                ownedStockCount: ownedAmount,
                config: app.get("config"),
                env: app.get("env"),
            };

            res.send(info);
        });
    };
};

BrokerApi.instance = null;
module.exports = function(app) {

    if (!BrokerApi.instance)
        BrokerApi.instance = new BrokerApi(app);

    return BrokerApi.instance;
};
