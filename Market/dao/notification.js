var colors = require("colors");
var log = require("../modules/Log")("Order", true, true);

var Notifications = function(app) {

	var self = this;
	var DB = app.get("DB");

	/**
	 * Vrati neodeslane zpravy o prijatych orderech
	 */
	this.getUnnotifiedReceivedOrders = function(done) {
		DB.ps(done, "SELECT * FROM get_unnotified_receiving_orders();");
	};

	/**
	 * Vrati neodeslane zpravy o probehlych tradech
	 */
	this.getUnnotifiedTrades = function(done) {
		DB.ps(done, "SELECT * FROM get_unnotified_trades();");
	};

	/**
	 * Vrati neodeslane zpravy o zrusenych orderech
	 */
	this.getUnnotifiedCanceledOrders = function(done) {
		DB.ps(done, "SELECT * FROM get_unnotified_canceled_orders();");
	};

	/**
	 * Vrati neodeslane zpravy o expirovanych orderech
	 */
	this.getUnnotifiedExpiredOrders = function(done) {
		DB.ps(done, "SELECT * FROM get_unnotified_expired_orders();");
	};

	/**
	 * Nastavi zpravu o prijeti orderu za prijatou
	 */
	this.setOrderReceivingNotified = function(id, done) {
		DB.ps(done, "SELECT set_order_receiving_notified($1) as order_notified;", id);
	};

	this.setCancelOrderReceived = function(id, done) {
		DB.ps(done, "SELECT set_cancel_order_received($1) as cancel_received;", id);
	};

	return this;
};

// singleton
Notifications.instance = null;
module.exports = function(app) {

	if (Notifications.instance == null)
		Notifications.instance = new Notifications(app);

	return Notifications.instance;
};