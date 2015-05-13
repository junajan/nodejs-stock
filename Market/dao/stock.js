var colors = require("colors");
var log = require("../modules/Log")("Stock", true, true);

var Stock = function ( app ) {
    var self = this;
    var DB = app.get("DB");
    var TABLE = 'stocks';

    this.findAll = function(cb) {
        DB.ps(cb, 'SELECT * FROM get_stocks()');
    };

    this.updateSock = function(id, data, cb) {
        var n = {
            price: data.price,
            shares: data.shares,
            ticker: data.ticker,
            name: data.name
        };
        DB.update (cb, TABLE, n, "id = "+id );
    };

    this.addCompany = function(name, done) {
        DB.ps(done, "SELECT create_company($1);", name);
    };

    this.addStock = function(data, done) {
        // console.log("SELECT create_stock("+data.companyId+", CURRENT_DATE, "+data.shares+", '"+data.ticker+"', '"+data.name+"', "+data.price+");");
        DB.ps(done, "SELECT create_stock($1, CURRENT_DATE, $2, $3, $4, $5);", [data.companyId, data.shares, data.ticker, data.name, data.price]);
    };

    this.getOrders = function(stockId, done) {
        // DB.getData(done, "*", "live_orders", "stock_id = $1", stock_id);
        DB.ps(done, "SELECT * FROM get_active_orders($1);", stockId);
    };

    this.emit = function(stock_id, amount, price, done) {

        DB.ps(function(err, res) {
            if(err)
                return done(err, res);

            DB.ps(done, "SELECT ask(emitor_id(),$1, $2, $3);", [stock_id, amount, price]);
        }, "SELECT emit($1, $2, $3);", [stock_id, amount, price]);
    };

    return this;
};

// singleton
Stock.instance = null;
module.exports = function( app ) {

    if ( Stock.instance === null )
        Stock.instance = new Stock( app );

    return Stock.instance;
};