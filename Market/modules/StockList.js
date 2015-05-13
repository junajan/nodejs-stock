var colors = require("colors");
var log = require("../modules/Log")("StockList", true, true);
var _ = require("underscore");
var async = require('async');
var GlobalEvents = require('./EventEmitter');

var StockList = function(app, MARKET_API) {
    
    // konfigurace
    var Stock = require("../dao/stock")(app);

    // this ukazatel
    var self = this;
    var stock = [];

    this.init = function(done) {
        log.event("Nacitam seznam akcii z DB");
        self.readStocks(done);
    };

    this.readStocks = function(done) {
        Stock.findAll(function(err, res) {
            if(!err)
                stock = res;
            else
                log.error("Wrong result for stock list");

            done && done(err, res);
        });
    };

    this.getList = function() {
        return stock;
    };

    this.getStockById = function(id) {
        for(var i = 0; i < stock.length; i++)
            if(stock[i].id == id)
                return stock[i];
        return false;
    };

    this.setPriceVolume = function(id, price, volume, strikeTime) {
        var stock = self.getStockById(id);
        if(stock) {

            stock.priceOld = stock.price;
            stock.volume = volume;
            stock.price = price;
            stock.strikeTime = strikeTime;
            stock.priceChange = parseFloat((stock.price - stock.priceOld) / stock.priceOld).toFixed(2);
            
            return true;
        }
        return false;
    };

    this.updateStockVolume = function(id, volume) {
        var stock = self.getStockById(id);
        stock.shares += volume;
    };

    this.emit = function(data, done) {
        Stock.emit(data.stockId, data.amount, data.price, function(err, res) {
            if(!err)
                self.updateStockVolume(data.stockId, data.amount);
            
            return done(err);
        });
    };

    this.getStockByCode = function(code) {
        for(var i = 0; i < stock.length; i++)
            if(stock[i].ticker == code)
                return stock[i];
        return false;
    };

    return this;
};

StockList.instance = null;
module.exports = function(app) {

    if (StockList.instance == null)
        StockList.instance = new StockList(app);

    return StockList.instance;
};
