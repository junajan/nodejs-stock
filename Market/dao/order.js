var colors = require("colors");
var log = require("../modules/Log")("Order", true, true);

var Order = function ( app ) {

    var DB = app.get("DB");

    this.expire = function(id, done) {
        DB.ps(done, "SELECT expire_order($1) as expired;", id);
    };

    this.getExpiredOrders = function(ttl, done) {
        DB.ps(done, "SELECT * FROM get_old_active_orders($1);", ttl);
    };

    this.cancel = function(id, done) {
        DB.ps(done, "SELECT cancel_order($1) as cancelled;", id);
    };

    this.finish = function(id, done) {
        DB.ps(done, "SELECT set_order_completion_notified($1);", id);
    };

    this.finishTradeBuyer = function(buyOrderId, sellOrderId, done) {
        DB.ps(done, "SELECT set_trade_buyer_notified($1, $2);", [buyOrderId, sellOrderId]);
    };

    this.finishTradeSeller = function(buyOrderId, sellOrderId, done) {
        DB.ps(done, "SELECT set_trade_seller_notified($1, $2);", [buyOrderId, sellOrderId]);
    };

    this.getOrdersMarkedToCancel = function(done) {
        DB.ps(done, "SELECT * FROM get_uncanceled_orders();");
    };

    this.markToCancel = function(id, done) {
        DB.ps(done, "SELECT set_cancel_order_received($1) as cancelled;", id);
    };

    this.getActiveOrder = function(id, done) {
        DB.ps(done, "SELECT * FROM get_active_order($1);", id);
    };

    this.add = function(data, done) {
        if(data.type === 1)
            DB.ps(done, "SELECT bid($1, $2, $3, $4) as inserted;", [data.broker, data.stockId ,data.amount, data.price]);
        else
            DB.ps(done, "SELECT ask($1, $2, $3, $4) as inserted;", [data.broker, data.stockId,data.amount, data.price]);
    };

    return this;
};

// singleton
Order.instance = null;
module.exports = function( app ) {

    if ( Order.instance == null )
        Order.instance = new Order( app );

    return Order.instance;
};
