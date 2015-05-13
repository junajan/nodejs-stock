var serverStatus = require("../modules/serverStatus")();

var Stock = require("../mongoose/stock");
var StockList = require("../mongoose/stockList");
var log = require("./log")(true, true, "RobotUI");
var async = require("async");
var http = require("http");
var _ = require("underscore");
var Order = require("../mongoose/order");
var MyStock = require("../mongoose/mystock");
var History = require("../mongoose/history");

var Events = require("./events");


var RobotUI = function(app, STOCK) {
    console.log("Loading ROBOT UI");

    var self = this;
    var STOCK_STATS = {};
    var actualStock = {};
    var ROBOT_TURN_ON = true;

    var ROBOT_PROCESS_INTERVAL = app.get("config").ui.interval;
    var ROBOT_PROCESS_DELAY = app.get("config").ui.delay;
    var TRADE_ONLY_CODES = app.get("config").ui.stocks;
    var ORDER_AMOUNT_SELL_LIMIT = app.get("config").ui.sell_limit;
    var ORDER_AMOUNT_LIMIT = app.get("config").ui.buy_limit;
    var ORDER_PRICE_RANGE = app.get("config").ui.price_range;

    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    this.sellOrderExpired = function(info) {

        if (!STOCK_STATS[info.code])
            return false;

        STOCK_STATS[info.code].owned += info.amount;
        STOCK_STATS[info.code].sell_order -= info.amount;
    };

    this.buyOrderExpired = function(info) {

        if (!STOCK_STATS[info.code])
            return false;

        STOCK_STATS[info.code].buy_order -= info.amount;
    };

    this.buyOrderProcessed = function(info) {

        if (!STOCK_STATS[info.code])
            return false;

        STOCK_STATS[info.code].buy_order -= info.amount;
        STOCK_STATS[info.code].owned += info.amount;
    };

    this.sellOrderProcessed = function(info) {

        if (!STOCK_STATS[info.code])
            return false;

        STOCK_STATS[info.code].sell_order -= info.amount;
    };

    this.buyStock = function(code, price, amount, doneAll) {

        var priceSum = parseFloat((price * amount).toFixed(2));
        var buyOrder = {
            type: 1,
            code: code,
            price: price,
            priceSumValue: priceSum,
            amount: amount
        };

        STOCK.addBuyOrder(buyOrder, function(err, res) {

            if (!err) {

                // sestav data s infem pro ulozeni do historie prikazu
                var histData = {
                    type: buyOrder.type,
                    code: buyOrder.code,
                    price: buyOrder.price,
                    amount: buyOrder.amount
                };

                // uloz prikaz do historie
                History.saveEvent(histData);

                STOCK_STATS[buyOrder.code].buy_order += buyOrder.amount;
            } else {

                log.message(("Buy order nebyl prijat: " + err).red);
            }

            doneAll(false);
        });
    };

    this.sellStock = function(code, price, amount, done) {

        log.message(("Selling " + amount + "x " + code + " for price: " + price).yellow);
        var sellOrder = {
            type: 0,
            code: code,
            price: price,
            priceSumValue: parseFloat((price * amount).toFixed(2)),
            amount: amount
        };

        STOCK.sellStock(sellOrder, function(err, res) {

            if (!err) {

                // sestav data s infem pro ulozeni do historie prikazu
                var histData = {
                    type: sellOrder.type,
                    code: sellOrder.code,
                    price: sellOrder.price,
                    amount: sellOrder.amount
                };

                // uloz prikaz do historie
                History.saveEvent(histData);

                STOCK_STATS[sellOrder.code].sell_order += sellOrder.amount;
                STOCK_STATS[sellOrder.code].owned -= sellOrder.amount;
            } else {

                log.message(("Sell order nebyl prijat: " + err).red);
            }

            done(false);
        });
    };

    function sellProcess(done) {

        // projed nakoupene akcie, pokud nejaka klesla moc, tak ji prodej
        async.each(Object.keys(STOCK_STATS), function(code, cb) {

            if (!(code in actualStock)) {
                console.log("Ticker is not on stock market: ".red, code);
                return cb(false);
            }

            var item = actualStock[code];
            if (STOCK_STATS[code].owned < 1)
                return cb(false);

            var amount = getRandomInt(1, STOCK_STATS[code].owned);
            if (getRandomInt(0, 1))
                var percentChange = -1 * getRandomInt(0, ORDER_PRICE_RANGE * 10) / 10;
            else
                var percentChange = getRandomInt(0, ORDER_PRICE_RANGE * 10) / 10;

            var price = parseFloat((item.price + item.price / 100 * percentChange).toFixed(2));
            self.sellStock(code, price, amount, cb);
        }, done);
    }

    function buyProcess(done) {

        // nakup akcii
        async.each(Object.keys(STOCK_STATS), function(code, cb) {
            var item = actualStock[code];

            if (!(code in actualStock)) {
                console.log("Ticker is not on stock market: ".red, code);
                return cb(false);
            }

            if (STOCK_STATS[code].buy_order >= ORDER_AMOUNT_LIMIT)
                return cb(false);

            if (getRandomInt(0, 2)) {

                var percentChange;
                var amount = getRandomInt(1, 50);
                if (amount + STOCK_STATS[code].buy_order > ORDER_AMOUNT_LIMIT)
                    amount = ORDER_AMOUNT_LIMIT - STOCK_STATS[code].buy_order;

                if (getRandomInt(0, 1))
                    percentChange = getRandomInt(0, ORDER_PRICE_RANGE * 10) / 10 / 2;
                else
                    percentChange = -1 * getRandomInt(0, ORDER_PRICE_RANGE * 10) / 10;

                var price = parseFloat((item.price + item.price / 100 * percentChange).toFixed(2));

                self.buyStock(code, price, amount, cb);
            } else {

                cb(false);
            }

        }, done);
    }

    function robotProcess() {

        // pockame, dokud nebudeme pripojeni k burze
        if (!serverStatus.get("authenticated") || ROBOT_TURN_ON == false)
            return setTimeout(robotProcess, ROBOT_PROCESS_INTERVAL);

        // nacteme aktualni stav akcii na burze
        actualStock = STOCK.getStocks();

        // provedeme paralelne buy a sell zpracovani
        async.parallel([
            sellProcess,
            buyProcess
        ], function(err, done) {

            self.printStats();
            setTimeout(robotProcess, ROBOT_PROCESS_INTERVAL);
        });
    }

    function startRobot() {
        log.message("Starting robot".yellow);
        setTimeout(robotProcess, ROBOT_PROCESS_DELAY);
    }

    this.createStatIfNotExists = function(ticker) {
        if (!STOCK_STATS[ticker])
            self.initCode(ticker);
    };

    this.loadOwnedStock = function(done) {

        MyStock.aggregate([{
            $match: {
                amount: {
                    $gt: 0
                }
            }
        }, {
            $group: {
                _id: "$code",
                sum: {
                    $sum: "$amount"
                }
            }
        }], function(err, data) {
            if (!err && data.length) {

                data.forEach(function(item) {
                    self.createStatIfNotExists(item._id);
                    STOCK_STATS[item._id].owned = item.sum;
                });
            }
            done(err);
        });
    };

    this.loadOrderedStock = function(done) {

        Order.aggregate([{
            $match: {
                invalid: null,
                cancelled: 0,
                expired: 0
            }
        }, {
            $project: {
                type: "$type",
                code: "$code",
                count: {
                    $subtract: ["$amount", "$filledAmount"]
                }
            }
        }, {
            $group: {
                _id: {
                    code: "$code",
                    type: "$type"
                },
                count: {
                    $sum: "$count"
                }
            }
        }], function(err, data) {

            var types = ["sell_order", "buy_order"];
            if (!err)
                data.forEach(function(item) {

                    STOCK_STATS[item._id.code][types[item._id.type]] += item.count;
                });

            done(err);
        });
    };

    this.initCode = function(code) {
        STOCK_STATS[code] = {
            owned: 0,
            buy_order: 0,
            sell_order: 0,
        };
    };

    this.initSpace = function() {
        TRADE_ONLY_CODES.forEach(self.initCode);
    };

    this.init = function() {
        Events.on("loadedUI", startRobot);

        self.initSpace();

        async.auto({
            ordered: self.loadOrderedStock,
            owned: self.loadOwnedStock,
        }, function(err, done) {

            // console.log("...STARTING UI...");
            Events.emit("loadedUI");
        });
    };

    this.getStats = function(code) {

        if (code && code in STOCK_STATS[code])
            return STOCK_STATS[code];
        else if (!code)
            return STOCK_STATS;

        return {};
    };

    this.printStats = function() {

        // console.log ( "................STATS................" );
        // console.dir ( STOCK_STATS );
    };

    this.getRobotState = function() {

        return ROBOT_TURN_ON;
    };

    this.switchRobotState = function() {

        ROBOT_TURN_ON = !ROBOT_TURN_ON;
        log.message("Changing robot state to: " + ROBOT_TURN_ON);
        return ROBOT_TURN_ON;
    };

    this.init();
    return this;
};


RobotUI.instance = null;
module.exports = function(app, stock) {

    if (!RobotUI.instance)
        RobotUI.instance = new RobotUI(app, stock);

    return RobotUI.instance;
};