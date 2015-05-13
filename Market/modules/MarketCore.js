var colors = require("colors");
var Log = require("../modules/Log")("MarketCore", true, true);
var _ = require("underscore");
var GlobalEvents = require('./EventEmitter');
var async = require('async');
var util = require('util');

/**
 * Spocita desitkovy nasobek, kterym musime vynasobit tick size
 * aby z nej vyslo cele cislo
 */
var MarketCore = function(app, MarketApi) {

    // konfigurace
    var self = this;
    var CONFIG = app.get("config").core;
    var StockList = require("./StockList")(app);
    var OrderBook = require("./OrderBook")(app, MarketApi);
    var Workers = require("../workerServer")(app);
    var OrderMatching = require("./OrderMatching")(app);

    // this ukazatel
    self.info = {
        startTime: null,
    };

    self.cancelOrder = function(id, cb) {
        OrderBook.addCancelOrder(id, cb);
    };

    /**
     * Odstrani expirovane prikazy a da vedet brokerum
     */
    self.processUnnotifiedAddOrders = function(done) {

        OrderBook.processUnnotifiedAddOrders(done);
    };

    self.updateProcessedTickers = function(tickerResults, done) {
        async.map(tickerResults, self.updateProcessedTicker, done);
    };

    self.updateProcessedTicker = function(res, done) {
        var stock = StockList.getStockById(res.info.stockId);
        // Log.event(" => Result for "+stock.ticker+" ("+res.info.stockId+") | price: " + stock.price + " => "+ res.info.price + " | trades count: "+ res.trades.length );

        // update price based on new data
        StockList.setPriceVolume(res.info.stockId, res.info.price, res.info.volume, res.info.strikeTime);

        // process trades
        async.map(res.trades, function(trade, done) {

            // send order notification to brokers
            OrderBook.notifyProcessedTrade(trade, res.info, done);
        }, done);
    };

    /**
     * Zpracuje objednavky
     */
    self.processOrders = function(done) {
        
        OrderMatching.process(StockList.getList(), Workers.getWorkers(), function(err, res) {
            if(res === 1)
                return done(err, res);

            if(err) {
                Log.error("Order matching has returned error: ", err);
                done(err, 0);
            }

            self.updateProcessedTickers(res, done);
        });
    };

    /**
     * Nacti seznam akcii
     */
    self.initStockList = function(done) {
        StockList.init(done);
    };

    self.printTickStartMessage = function(done) {

        // console.log("========== Starting new cycle ============ ");
        console.time("============ Ending cycle =============== ");
        done(null);
    };

    self.printTickStopMessage = function(done) {

        console.timeEnd("============ Ending cycle =============== ");
        done(null);
    };

    /**
     * Vrati vybrane info o serveru
     */
    self.getServerInfo = function(done) {
        return done(null, self.info);
    };

    self.handleMarketError = function(err) {
        Log.error(err);
    };

    /**
     * Market core hearthbeat
     *  - run in given interval function to process orders
     */
    self.tick = function() {
        
        async.series([
            self.printTickStartMessage,

            OrderBook.processCancelOrders,
            OrderBook.processExpiredOrders,
            self.processOrders,

            MarketApi.sendBrokerStockList,
            self.printTickStopMessage,
        ], function(err) {
            if (err)
                return self.handleMarketError(err);

            // plan next tick
            setTimeout(self.tick, CONFIG.orderMatchingInterval);
        });
    };

    /**
     * Ukonci cinnost a vrat vse do puvodniho stavu
     *  - kdyz burza ukoncuje svou cinnost
     */
    self.deinit = function(res) {
        Log.event("Deinicializace marketu");
    };

    /**
     * Initace stavu burzy - nacte predchozi stav z DB
     */
    self.init = function() {
        Log.event("Probiha init jadra marketu");

        self.info.startTime = Date.now();
        async.waterfall([
            self.initStockList,
        ], function(err) {

            Log.event("Inicializace marketu byla dokoncena - spoustim burzovni cyklus");
            GlobalEvents.emit("marketCoreInitialized");

            try {
                self.tick();
            } catch (e) {
                self.deinit(e);
            }
        });
    };

    self.init();
    return this;
};

// zdedime event emitter
// -> marketCore bude emitovat eventy pri svem behu
// util.inherits(MarketCore, GlobalEvents);

// singleton
MarketCore.instance = null;
module.exports = function(app, api) {

    if (MarketCore.instance == null)
        MarketCore.instance = new MarketCore(app, api);

    return MarketCore.instance;
};
