var colors = require("colors");
var async =  require("async");
var Events = require("./Events");
var log = require ( "../modules/Log")(true, true);

var StockList = function StockList (app, StockList) {
    var self = this;
    var DB = app.get("DB");
    self.inited = false;
    self.stockList = {};

    self.getList = function() {
        return self.stockList;
    };

    /**
     * Get stock info by ticker
     */
    self.getStockByTicker = function(ticker) {
        if(ticker in self.stockList)
            return self.stockList[ticker];
        return false;
    };

    /**
     * Get stock info by ID
     */
    self.getStockById = function(id) {
        for(var i in self.stockList) {
            if(self.stockList[i].id == id)
                return res.json(self.stockList[i]);
        }
        return false;
    };

    /**
     * Upsert stock
     */
    self.upsertStock = function(item) {
        self.stockList[item.ticker] = item;
    };

    self.refreshList = function(list) {
        list.forEach(function(item) {
            self.upsertStock(item);
        });
        self.inited = true;
    };

    /**
     * This will read last known stock list from DB
     */
    self.init = function() {
        DB.stocks.find ({}, function (err, res) {
            if(res && res.length)
                self.refreshList(res, true);
            Events.emit("StockListInited");
        });
    };

    // listen on stock refresh event
    Events.on("stockListRefresh", self.refreshList);

    // init stock list on start from DB
    self.init();
    return this;
};


StockList.instance = null;
module.exports = function (app) {
    
    if (StockList.instance == null)
        StockList.instance = new StockList (app);

    return StockList.instance;
};
