var colors = require("colors");
var http = require("http");
var async = require("async");
var log = require("./modules/log")(true, true);
var serverStatus = require("./modules/serverStatus")();
var SocketIO = require("socket.io-client");
var Events = require("./modules/events");

/**
 * Trida zajistujici pripojeni se ke klientovi
 * @param {Object} server express server
 * @param {Object} app    aplikace
 */
var MarketClient = function MarketClient(server, app) {

    var self = this;
    var socket = null;
    var IntConnection = null;
    var socketConnectTimeInterval = 0;
    serverStatus.set("authenticated", false );
    
    // MarketClient API - vyrizuje a vytvari requesty
    var MarketClient = require("./modules/marketClient")(app);

    /**
     * Event zavolany pri pripojeni
     */
    this.onConnected = function(data, cb) {
        if (socket.connected)
            clearInterval( socketConnectTimeInterval );

        log.success("Connected to MarketAPI");
        serverStatus.set("connected", true);

        // pokud bylo spojeni uspesne, zrus interval v kterem se zkousime pripojit k serveru
        clearInterval(IntConnection);

        // predej informaci o spojeni do MarketClient API
        MarketClient.call(MarketClient.onConnectedToServer, "connect", socket)(data, cb);
    };

    /**
     * Event zavlany pri odpojeni
     */
    this.onDisconnected = function(data, cb) {

        log.message("MarketAPI has just disconnected".red);
        serverStatus.set("connected", false);
        serverStatus.set("authenticated", false);

        Events.emit("serverChange");
        Events.emit("disconnected");
        
        socketConnectTimeInterval = setInterval(function() {

            log.message(("Reconnecting to stock server").yellow);
            if (socket.connected) {
                return clearInterval(socketConnectTimeInterval);
            }
        }, 1000);
    };

    /**
     * Metoda zajistujici pripojeni MarketClienta k burzovnimu serveru
     * @param  {Object} conf Konfigurace spojeni
     */
    this.connectToStockServer = function(conf) {
        var addr = conf.protocol+"://"+conf.addr + ":" + conf.port;
        log.message(("Connecting to stock server " + addr).yellow);

        socket = SocketIO.connect(
            addr, {
                'force new connection': true,
                'reconnection delay': 100, // defaults to 500
                'reconnection limit': Infinity, // defaults to Infinity
                'max reconnection attempts': Infinity, // defaults to 10
            }
        );

        socket.on('updatedStockList', MarketClient.updatedStockList);
        socket.on('orderProcessed', MarketClient.orderProcessed);
        socket.on('orderCancelled', MarketClient.orderCancelled);
        socket.on('orderExpired', MarketClient.orderExpired);
        socket.on('connect', self.onConnected);
        socket.on('disconnect', self.onDisconnected);
    };

    self.connectToStockServer(app.get("stock"));
    return this;
};

// singleton trida 
MarketClient.instance = null;
module.exports = function(server, io) {
    if (MarketClient.instance === null)
        MarketClient.instance = new MarketClient(server, io);
    return MarketClient.instance;
};