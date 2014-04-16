var serverStatus = require("../modules/serverStatus")();

var Stock = require("../mongoose/stock");
var StockList = require("../mongoose/stockList");
var log = require("./log")(true, true, "BrokerApi");
var async = require("async");
var http = require("http");
var _ = require("underscore");
var Order = require("../mongoose/order");
var MyStock = require("../mongoose/mystock");
var History = require("../mongoose/history");

var Events = require("./events");


var BrokerApi = function(app) {
    console.log("Loading Broker API");

    var MARKET_API = require("./marketClient")(app);

    var SOCKET = null;
    var BROKER = this;
    var stockInfo = {};

    var TestOrders = false;

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
        }
    }

    this.getClientDetail = function(req, res) {

        res.send({});
    }

    this.getHistory = function(req, res) {

        function returnData(err, data) {

            res.send({history: data});
        }

        History.find().sort({ date: -1 }).exec(returnData);
    }

    this.getStocks = function(req, res) {

        res.send({});
    }

    this.getMyStocks = function(req, res) {

        function returnData(err, data) {

            res.send({ ownedStocks: data, stocks: MARKET_API.getStocks() });
        }

        MyStock.find({ invalid: null, amount: { $gt: 0 } }, {}, { sort: { date: -1 }}, returnData );
    }

    this.getStockInfo = function(req, res) {

        res.send({});
    }

    this.getPendingOrders = function(req, res) {
        function returnData(err, data) {

            res.send({
                orders: data
            });
        };

        Order.find({ invalid: null, $where: "this.filledAmount < this.amount " }, {}, {
            sort: {
                date: -1
            }
        }, returnData);
    }

    this.getOrders = function(uid, cb) {

        Order.find({
            invalid: null,
            $where: "this.filledAmount < this.amount "
        }, cb);
    }

    this.getStatus = function(req, res) {

        res.send(serverStatus.getData());
    }

    this.getServerStatusInfo = function() {

        return {
            "connected": serverStatus.get("authenticated")
        }
    }

    return this;
}


BrokerApi.instance = null;
module.exports = function(app) {

    if (!BrokerApi.instance)
        BrokerApi.instance = new BrokerApi(app);

    return BrokerApi.instance;
}