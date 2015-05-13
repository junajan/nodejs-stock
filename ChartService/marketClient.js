var colors = require("colors");
var _ = require("underscore");
var http = require("http");
var async = require("async");
var log = require("./modules/Log")(true, true);
var socketIO = require("socket.io-client");

/**
 * This class will handle connection with market
 */
var Stock = function Stock(server, app) {

	var self = this;
	self.socket = null;
	self.connectionInterval = null;
	
	// Market API - will handle events sent from makret
	var MarketClient = require("./modules/MarketClient")(app);

	/**
	 * Function called when connected to market server
	 */
	this.onConnected = function(data, cb) {

		log.message("Connected to server".yellow);
		app.set("connected", true);

		// clear interval for market client connection interval
		clearInterval(self.connectionInterval);

		// start market Api client process
		MarketClient.call(MarketClient.onConnectedToServer, "connect", self.socket)(data, cb);
	};
	
	/**
	 * When disconnected
	 */
	this.onDisconnected = function(data, cb, socket) {

		log.message("Market server has just disconnected".yellow);
		app.set("connected", false);
	};

	/**
	 * This will try to connect to market server
	 */
	this.connectToStockServer = function(conf) {
		var address = "http://"+conf.address + ":" + conf.port;
		log.message("Connecting to market server:".yellow, address);

		self.socket = socketIO.connect(
			address,
			{
				'force new connection': true,
				'reconnection delay': 100, // defaults to 500
				'reconnection limit': Infinity, // defaults to Infinity
				'max reconnection attempts': Infinity // defaults to 10
			}
		);

		self.socket.on('updatedStockList', MarketClient.updatedStockList);
		self.socket.on('connect', self.onConnected);
		self.socket.on('disconnect', self.onDisconnected);
	};

	/**
	 * Constructor
	 */
	this.init = function() {
		app.set("connected", false);

		// in configured interval, try to connect to server
		// self.connectionInterval = setInterval(function() {
			self.connectToStockServer(app.get("config").market);
		// }, app.get("config").market.connectInterval);
	};

	this.init();
	return this;
};

Stock.instance = null;
module.exports = function(server, io) {
	if (Stock.instance === null) {
		Stock.instance = new Stock(server, io);
	}
	return Stock.instance;
};