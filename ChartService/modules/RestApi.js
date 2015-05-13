var colors = require("colors");
var async =  require("async");
var Events = require("./Events");
var log = require ( "../modules/Log") ( true, true );

var LOAD_INTERVAL = 1000;
var MAX_ENTRY_COUNT = 3600 * 10 ;

var RestApi = function RestApi ( app ) {
    var self = this;
    var DB = app.get("DB");
    var MarketClient = require("./MarketClient")(app);
    var StockList = require("./StockList")(app);
    var HistoryService = require("./HistoryService")(app, StockList);

    /**
     * Will return stock list with all stocks
     */
    self.getStockList = function(req, res) {
        res.json(StockList.getList());
    };

    /**
     * Will return stock by its ticker
     */
    self.getStockDetail = function(req, res) {
        res.json(StockList.getStockByTicker(req.params.ticker) || {});
    };

    /**
     * This will return aggregated data to client
     */
    self.getStockHistory = function ( req, res ) {
        var chartData = HistoryService.getChartData(req.params.ticker, req.query.last);
        res.json({
            info: StockList.getStockByTicker(req.params.ticker) || {},
            data: (chartData) ? chartData.data : [],
            endTime: chartData.endTime
        });
    };

    return this;
};

RestApi.instance = null;
module.exports = function ( app ) {
    
    if (RestApi.instance == null)
        RestApi.instance = new RestApi ( app );

    return RestApi.instance;
};
