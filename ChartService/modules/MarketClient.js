var log = require("./Log")(true, true, "MarketClient");
var _ = require("underscore");
var async = require("async");
var Events = require("./Events");

var MarketClient = function(app) {
    log.event("Loading Market Client");

    var DB = app.get("DB");
    var self = this;
    self.socket = null;
    var MARKET_TIME_SHIFT = 0;

    /**
     * Caller of inner functions
     */
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

    function makeSeconds(t) {
        return parseInt(t / 1000) * 1000;
    }

    self.convertMarketTime = function(t) {
        return makeSeconds((new Date(t)).getTime()) + MARKET_TIME_SHIFT;
    };

    /**
     * When chart service was connected to server
     * - will save socket and start authentication
     */
    this.onConnectedToServer = function(data, cb, socket) {

        log.success("Connected to market server");
        self.socket = socket;
        self.authenticate(socket);
    };

    /**
     * Function will try to autenticate on market server
     */
    this.authenticate = function(socket) {

        log.event("Authenticating to market server");
        socket.emit("authenticate", app.get("config").market.auth, self.authenticated);
    };

    /**
     * Function called when chart service is autenticated on market server
     */
    this.authenticated = function(data) {

        if (data.res == "bad_credentials")
            return log.error("Bad credentials for MarketAPI".red);

        if (data.res == "authenticated")
            return log.error("Authentication was successful".green);

        return log.error(("Authentication - undefined error: " + JSON.stringify(data)).red);
    };

    /**
     * Function will print stock list to console
     */
    this.printStockList = function(list) {
        Object.keys(list).forEach(function(index) {
            var stock = list[index];
            var t = self.convertMarketTime(stock.strikeTime);

            console.log(stock.ticker + ": price: " + stock.price + " (" + stock.priceChange + "%) time: " + stock.strikeTime + " - used time: " + (new Date(t)));
        });
    };

    /**
     * This will save actual stock list to DB
     */
    this.saveHistory = function(stockList) {
        var simplified = [];

        // update or insert stock in DB
        async.each(stockList, function(item, done) {
            DB.stocks.update({
                id: item.id
            }, item, {
                upsert: true
            }, done);

            simplified.push({
                ticker: item.ticker,
                id: item.id,
                price: item.price,
                time: item.time,
                volume: item.volume,
            });
        }, function(err, res) {

            // add stock to history dable
            DB.stockHistory.insert(simplified);
        });
    };

    /**
     * Function will update local stock list
     * This function is called after each tick on market server
     */
    this.updatedStockList = function(data) {
        // log.event ("Receiving stock quotes data from market");

        for (var i in data.stockList) {

            data.stockList[i].time = (new Date()).getTime();
            data.stockList[i].price = parseFloat(data.stockList[i].price);
            // data.stockList[i].volume = parseInt(data.stockList[i].volume);
        }

        Events.emit("stockListRefresh", data.stockList);
        // save to DB
        self.saveHistory(data.stockList);
        // print to console
        // self.printStockList(data.stockList);
    };

    return this;
};


MarketClient.instance = null;
module.exports = function(app) {

    if (!MarketClient.instance)
        MarketClient.instance = new MarketClient(app);

    return MarketClient.instance;
};