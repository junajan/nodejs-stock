var colors = require("colors");
var Log = require("../modules/Log")("Messenger", true, false);
var _ = require("underscore");
var GlobalEvents = require('./EventEmitter');
var async = require('async');

var CALLBACK_TIMEOUT = 1000;

var Messenger = function(app, OrderBook, MarketApi) {

	var self = this;
	var DEBUG_SEND_AUTO_CONFIRM = false;

	// types of notifications
	self.T_PROCESSED = 2;
	self.T_CANCEL = 3;
	self.T_EXPIRE = 4;

	self.queue = {}; // brokers queue

	/**
	 * Pri pripojeni brokera vezmeme frontu a celou mu ji posleme
	 */
	self.onBrokerConnected = function(broker) {
		Log.event("Broker with id "+broker + "has just connected");

		// pokud fronta existuje a neni prazdna
		if(self.queue[broker] && self.queue[broker].length) {
			// kazdou zpravu odesli
			for(var i = 0; i < self.queue[broker].length; i++)
				self.sendToBroker(self.queue[broker][i], true);
		}
	};

	self.getNotifyMethodByType = function(type) {
		var method = false;

		switch(type) {
			case self.T_PROCESSED:
				method = MarketApi.sendBrokerNoticeOrderProcessed;
				break;
			case self.T_CANCEL:
				method = MarketApi.sendBrokerNoticeOrderCancelled;
				break;
			case self.T_EXPIRE:
				method = MarketApi.sendBrokerNoticeOrderExpired;
				break;
			default:
				throw "Unknown notificaton type";
		};
		return method;
	};


	/**
	 * Zkusi odeslat brokerovi notifikaci
	 * pokud odpovi spatne nebo nastane timeout, prida se notifikace do seznamu
	 * a po case se zkusi odeslat znova.
	 *
	 * Funkce se pouziva i pro opetovne odeslani, v takovem pripade se isInQueue nastavi na true
	 * aby se notifikace nepridavala opet do fronty
	 */
	self.sendToBroker = function(msg, isInQueue) {
		var processed = false;
		// nacte funkci, kterou ma zavolat pro odeslani notifikace
		var sendNotify = self.getNotifyMethodByType(msg.type);
		// Log.event("Sending notification for order("+msg.orderId+")");
		
		// zpracuje result
		var processResult = function(res) {
			// pokud funkce byla uz zavolana, ukonci se
			if(processed) return false;
			processed = true;

			// pokud BROKER vratil ok = true oznac order za vyrizeny
			if(res) {

				if(msg.type == self.T_PROCESSED) {
					// finish trade
					OrderBook.finishTrade(msg.buyOrderId, msg.sellOrderId, msg.side, function() {
						var side = msg.side === 1 ? "buyer" : "seller";
						// Log.event("Trade("+msg.orderId+") was successfully accepted by "+side );

						if(isInQueue)
							self.removeFromQueue(msg.brokerId, msg);
					});
				} else {

					// finish order
					OrderBook.finishOrder(msg.orderId, function() {
						Log.event("Order("+msg.orderId+") was successfully finished");

						if(isInQueue)
							self.removeFromQueue(msg.brokerId, msg);
					});
				}
			} else {
				// v jinem pripade (broker vratil chybnou odpoved / doslo k timeoutu)
				// pridej zpravu do fronty a odesli po case znovu
				if(!isInQueue)
					return self.add(msg.brokerId, msg);
			}
		};

		if(DEBUG_SEND_AUTO_CONFIRM) {
			console.log("AUTOCONFIRMING");	
			return processResult(1);
		}

		// odesle notifikaci a nastavi timeout
		sendNotify(msg.brokerId, msg, processResult);
		setTimeout(processResult, CALLBACK_TIMEOUT);
	};

	self.send = function(msg) {
		
		if(DEBUG_SEND_AUTO_CONFIRM)
			return self.sendToBroker(msg);
		
		if(MarketApi.isBrokerConnected(msg.brokerId)) {
			Log.event("Sending message to broker >> ", msg);
			self.sendToBroker(msg);
		} else
			self.add(msg.brokerId, msg);
	};


	self.sendMessage = function(message) {
		api.sendToBroker(message.broker, message);
	};
	
	self.queueExists = function(broker) {
		return self.queue[broker];
	};

	self.createQueue = function(broker) {
		self.queue[broker] = [];
	};

	self.add = function(broker, msg) {
		Log.error("Adding to queue");
		if(! self.queueExists(broker))
			self.createQueue(broker);

		self.queue[broker].push(msg);
	};

	self.removeFromQueue = function(broker, msg) {
		var qMsg, i;

		Log.error("Removing from queue", msg.orderId);

		if(!self.queueExists(broker))
			return false;

		for(i = 0; i < self.queue[broker].length; i++) {
			qMsg = self.queue[broker][i];
			if(qMsg.orderId == msg.orderId && qMsg.type == msg.type) {
				return self.queue[broker].splice(i, 1);
			}
		}
		return false;
	};

	/**
	 * Initace stavu burzy - nacte predchozi stav z DB
	 */
	self.init = function() {
		Log.event("Spoustim pocatecni inicializaci messengera");
	};

	self.init();
	GlobalEvents.on("brokerConnected", self.onBrokerConnected);
	return this;
};

// singleton
Messenger.instance = null;
module.exports = function(app, OrderBook, MarketApi) {

	if (Messenger.instance == null)
		Messenger.instance = new Messenger(app, OrderBook, MarketApi);

	return Messenger.instance;
};