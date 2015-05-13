var colors = require("colors");
var Log = require("../modules/Log")("MarketApi", true, false);
var _ = require("underscore");
var GlobalEvents = require('./EventEmitter');

var MarketApi = function(app) {
    var self = this;
    var BrokerSockets = {};
    var MarketCore = require("./MarketCore")(app, self);
    var StockList = require("./StockList")(app, self);

    // trida pro predavani zprav z marketu => brokerum
    var Order = require("../dao/order")(app);
    var Broker = require("../dao/broker")(app);

    /**
     * Funkce vracejici callback pro obsluhu socket.io eventu
     * callback funkce resi overeni prihlaseni
     * @param  {Function} f         Funkce, ktera se ma zavolat pri eventu
     * @param  {String} evName      Nazev eventu
     * @param  {Object} socket      Socket brokera
     * @param  {Boolean} authOnly   Bool hodnota urcujici zda je metoda jen pro prihlasene
     */
    this.call = function(f, evName, socket, authOnly) {
        
        return function(d, cb) {
            
            // authenticated only!
            if (!authOnly && !socket.auth)
                return self.unauthenticated(d, cb, socket, evName);

            Log.event(evName, d);
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

    /**
     * Odesle pripojenym brokerum nove info o akciich
     * @param  {Object} stockInfo Info o akciich
     */
    this.sendBrokerStockList = function(done) {

        var res = {
            error: null,
            stockList: StockList.getList()
        };

        for (var i in BrokerSockets)
            BrokerSockets[i].emit("updatedStockList", res);

        done(null);
    };

    /**
     * Checkne zda je broker pripojeny
     * kdyz ano, vrati socket, kdyz ne, vrati undefined
     */
    this.isBrokerConnected = function(id) {
        return BrokerSockets[id];
    };

    /**
     * Odesle brokerovi info o provedene akci
     * @param  {String}   brokerId Id brokera
     * @param  {Object}   data      Info o obchodu
     * @param  {Function} cb        Callback funkce pri vyrizeni
     * @param  {String}   name      Jmeno akce
     * @param  {String}   eventName Jmeno emitovaneho eventu
     */
    this.sendBrokerNotice = function(brokerId, data, cb, name, eventName) {

        if (BrokerSockets[brokerId]) {
            Log.message(("Sending "+name+" acknowledgement for order " + data.orderId).yellow);

            data.sendDate = Date.now();
            BrokerSockets[brokerId].emit(eventName, data, cb);
        }
    };

    /**
     * Odesle brokerovi info o provedenem obchodu
     * @param  {String}   brokerId Id brokera
     * @param  {Object}   data      Info o obchodu
     * @param  {Function} cb        Callback funkce pri vyrizeni
     */
    this.sendBrokerNoticeOrderProcessed = function(brokerId, data, cb) {

        self.sendBrokerNotice(brokerId, data, cb, "processed", "orderProcessed");
    };

    /**
     * Odesle brokerovi info o zrusenem prikazu
     * @param  {String}   brokerId Id brokera
     * @param  {Object}   data      Info o obchodu
     * @param  {Function} cb        Callback funkce pri vyrizeni
     */
    this.sendBrokerNoticeOrderCancelled = function(brokerId, data, cb) {

        self.sendBrokerNotice(brokerId, data, cb, "cancel", "orderCancelled");
    };

    /**
     * Odesle brokerovi info o vyexpirovanem prikazu
     * @param  {String}   brokerId Id brokera
     * @param  {Object}   data      Info o obchodu
     * @param  {Function} cb        Callback funkce pri vyrizeni
     */
    this.sendBrokerNoticeOrderExpired = function(brokerId, data, cb) {

        self.sendBrokerNotice(brokerId, data, cb, "expiry", "orderExpired");
    };

    /**
     * Odesle brokerovi info o chybnem loginu
     * @param  {Function} cb Callback funkce
     */
    this.sendBrokerLoginError = function(cb, res) {
        if(!res)
            Log.error(("Unknown broker").red, res);
        else
            Log.error(("Broker sent wrong credentials: " + res.name).yellow);
            
        cb({res: "bad_credentials"});
    };

    /**
     * Autentifikace brokera
     * @param  {Object}   data      Prihlasovaci udaje brokera
     * @param  {Function} cb        Callback funkce pri vyrizeni
     * @param  {Object}   socket    Socket pripojeneho brokera
     */
    this.authenticate = function(data, cb, socket) {
        // najdeme brokera v seznamu
        Broker.findByName(data.name, function(err, res) {
            if (!res || !res[0] || res[0].token != data.secret)
                return self.sendBrokerLoginError(cb, res[0]);

            Log.message(("Authenticated broker: " + res[0].name).yellow);

            // odesli brokerovi info o prihlaseni
            cb({res: "authenticated"});

            socket.auth = 1;
            socket.broker = res[0];
            BrokerSockets[res[0].id] = socket;

            GlobalEvents.emit("brokerConnected", res[0].id);
            Log.message(("Broker " + res[0].name + " was authenticated").green);
        });
    };

    /**
     * Funkce obsluhujici neautorizovane pozadavky
     * @param  {Objecz}   data   Payload pozadavku
     * @param  {Function} cb     Callback
     * @param  {Object}   socket Socket clienta
     */
    this.unauthenticated = function(data, cb, socket) {

        Log.error("Unauthenticated broker sent request");

        if (cb)
            cb({unauthenticated: 1});
        socket.disconnect();
    };

    /**
     * Event ktery se zavola pri pripojeni
     * @param  {Object} socket Socket klienta
     */
    this.onConnect = function(socket) {
        Log.message("Broker connected".yellow);
    };

    /**
     * Event zavolany pri reconnectu
     */
    this.onReconnect = function(data, cb, socket) {
        Log.message("Broker reconnected".yellow);
    };

    /**
     * Funcke obstaravajici zruseni prikazu
     * @param  {Object}   order  Info o prikazu
     * @param  {Function} cb     Callback funkce
     * @param  {Socket}   socket Socket brokera
     */
    this.cancelOrder = function(data, cb, socket) {
        error = false;

        if(! data.orderId)
            error = "Field orderId is missing!";
        
        if(error)
            return cb({error: error});

        Order.getActiveOrder(data.orderId, function(err, res) {
            if(err || !res.length || res[0].broker_id != socket.broker.id || res[0].amount < 1)
                return cb({error: "Requested order was not found."});

            Order.markToCancel(data.orderId, function(err, res) {
                if(err || !res.length) {
                    console.log("DB Error: ", err, res);
                    return cb({error: "There was an error when cancelling order!"});
                }

                Log.event("Order ("+data.orderId+") was cancelled :", res[0].cancelled);
                return cb({result: "accepted", amount: res[0].cancelled, orderId: data.orderId});
            });
        });
    };

    /**
     * Funkce prijma obchodni prikazy od brokeru
     * @param {Objecz}   order  Info o prikazu
     * @param {Function} cb     Callback funkce
     * @param {Object}   socket Socket brokera
     */
    this.setOrder = function(data, cb, socket) {
        var error = false;

        Log.event("Received order".yellow, data);

        if(! data.stockId)
            error = "Field stockId is missing!";
        if(! data.amount)
            error = "Field amount is missing!";
        if(! data.price)
            error = "Field price is missing!";
        if(! data.type && data.type !== 0)
            error = "Field type is missing!";
        
        if(error)
            return cb({error: error});

        data.broker = socket.broker.id;
        Order.add(data, function(err, res) {
            // console.log(err, res);

            if(err || !parseInt(res[0].inserted)) {
                return cb({error: "There was an error when adding order!"});
            }
            Log.event("New order was added with ID:", res[0].inserted);
            cb({id: res[0].inserted});
        });
    };

    this.getMyInfo = function(data, cb, socket) {
        var res = socket.broker;
        cb(res);
    };

    /**
     * Funkce na nacteni aktualnich informaci o akciich
     */
    this.getStockInfo = function(data, cb, socket) {

        var res = {
            error: null,
            stockList: StockList.getList()
        };

        return cb(res);
    };

    /**
     * Event pri odpojeni brokera
     */
    this.brokerDisconnected = function(data, cb, socket) {
        Log.message("Broker has just disconnected".yellow);

        if (socket.auth && socket.broker.id) {
            delete BrokerSockets[''+socket.broker.id];
        }
    };

    this.getMarketStatus = function(data, cb, socket) {

        var res = {
            startTime:MarketCore.info.startTime,         // počet sekund od posledního spuštění
            tickSize: app.get("config").core.tickSize,         // granularita příjmané ceny
            orderExpireTimeout: app.get("config").core.expiryTTL,         // granularita příjmané ceny
            orderMatchingInterval: app.get("config").core.orderMatchingInterval     // interval ve kterém se provádí order matching v ms
        };
        return cb(res);
    };

    /**
     * Vrati seznam prihlasenych brokeru spolu s jejich sokcety
     * @return {[type]} [description]
     */
    this.getOnlineBrokers = function() {

        return BrokerSockets;
    };

    return this;
};

MarketApi.instance = null;
module.exports = function(app) {

    if (MarketApi.instance == null)
        MarketApi.instance = new MarketApi(app);

    return MarketApi.instance;
};
