var serverStatus = require("../modules/serverStatus")();

var Stock = require("../mongoose/stock");
var StockList = require("../mongoose/stockList");
var log = require("./log")(true, true, "RobotApi");
var async = require("async");
var http = require("http");
var _ = require("underscore");
var Order = require("../mongoose/order");
var MyStock = require("../mongoose/mystock");
var History = require("../mongoose/history");

var Events = require("./events");


var RobotApi = function(app) {
    console.log("Loading Robot API");

    var MARKET_CLIENT = require("./marketClient")(app);

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
        };
    };

    this.getClientDetail = function(req, res) {

        res.send({});
    };

    this.getHistory = function(req, res) {
        function returnData(err, data) {
            res.send({history: data});
        }

        History.find().sort({ date: -1 }).limit(100).exec(returnData);
    };

    this.getStocks = function(req, res) {

        res.send( MARKET_CLIENT.getStocks() );
    };

    this.getTradedStocks = function(req, res) {

        res.send( MARKET_CLIENT.ROBOT_UI.getStats() );
    };

    this.getMyStocks = function(req, res) {

        function returnData(err, data) {
            res.send({ ownedStocks: data, stocks: MARKET_CLIENT.getStocks() });
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

        Order.find({ invalid: null, cancelled: 0, expired: 0, $where: "this.filledAmount < this.amount " }, {}, {
            sort: {
                date: -1
            }
        }, returnData);
    }

    this.getStatus = function(req, res) {

        res.send(serverStatus.getData());
    }

    this.getServerStatusInfo = function() {

        return {
            "connected": serverStatus.get("authenticated")
        }
    }

    this.getRobotState = function ( req, res ) {

        res.send( { state: MARKET_CLIENT.ROBOT_UI.getRobotState()});
    }
    
    this.switchRobotState = function ( req, res ) {

        res.send( { state: MARKET_CLIENT.ROBOT_UI.switchRobotState()});
    }

    this.getRobotInfo = function ( req, res ) {

        function getOwnedStockSum ( done ) {

            MyStock.aggregate(  
                { $match: { amount: { $gt: 0 }}},
                { $group: { _id: '$typeId', amount: { $sum: '$amount' }}}, // 'group' goes first!
                { $project: { _id: 1, amount: 1 }}, // you can only project fields from 'group'
                function ( err, res ) {

                    if ( err ) {

                        console.dir ( err );
                        return done ( err, "Chyba při aggregaci." );
                    }

                    if ( res.length == 1 )
                        done ( err, res[0].amount );
                    else
                        done ( err, 0 );
                }
            );
        }

        function getPendingRequestsCount ( done ) {

            Order.count( { invalid: null, cancelled: 0, expired: 0, $where : "this.filledAmount < this.amount "}, done );
        }

        async.auto ({ ownedCount: getOwnedStockSum, pendingCount: getPendingRequestsCount}, function ( err, data ) {

            var info = {
                connected: serverStatus.get("authenticated"),
                robotState: MARKET_CLIENT.ROBOT_UI.getRobotState(),
                serverStatus: serverStatus.getData(),
                startTime: app.get("startTime"),
                config: app.get("config"),
                env: app.get("env"),
                pendingCount: data.pendingCount,
                ownedSum: data.ownedCount,
            }

            res.send( info );
        });
    }

    return this;
}


RobotApi.instance = null;
module.exports = function(app) {

    if (!RobotApi.instance)
        RobotApi.instance = new RobotApi(app);

    return RobotApi.instance;
}