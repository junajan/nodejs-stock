var colors = require("colors");
var _ = require("underscore");
var http = require("http");
var async = require("async");
var log = require("./modules/log")(true, true);
var serverStatus = require("./modules/serverStatus")();
var socketIO = require("socket.io-client");

var Events = require("./modules/events");
/**
 * Trida zajistujici pripojeni se k burze
 */
var Stock = function Stock(server, app) {

    var INT_BROKER_CONNECT = app.get("config").broker_connect_interval; // 1000ms default
    var BROKER_SERVER = this;
    var STOCK_SOCK = null;

    var IntConnection = null;

    // broker API - vyrizuje a vytvari requesty
    var BROKER = require("./modules/marketClient")(app);

    /**
     * Event zavolany pri pripojeni
     */
    this.onConnected = function(data, cb) {

        log.message("Connected to server".yellow);
        serverStatus.set("connected", true);

        // pokud bylo spojeni uspesne, zrus interval v kterem se zkousime pripojit k serveru
        clearInterval(IntConnection);

        // predej informaci o spojeni do broker API
        BROKER.call(BROKER.onConnectedToServer, "connect", STOCK_SOCK)(data, cb);
    };
    
    /**
     * Event zavlany pri odpojeni
     */
    this.onDisconnected = function(data, cb, socket) {

        log.message("Server has just disconnected".yellow);
        serverStatus.set("connected", false);
        serverStatus.set("authenticated", false);

        Events.emit("serverChange");
        Events.emit("disconnected");

        // IntConnection = setInterval( function () {

        //     BROKER_SERVER.connectToStockServer( app.get("stock") );
        // }, INT_BROKER_CONNECT);
        // 
        // socketConnectTimeInterval = setInterval(function() {

        //     log.message(("Reconnecting to stock server").yellow);

        //     // STOCK_SOCK.reconnect();
        //     // if (STOCK_SOCK.connected) {
        //     //     clearInterval(socketConnectTimeInterval);
        //     // }
        // }, 500);
    };

    /**
     * Metoda zajistujici pripojeni brokera k burzovnimu serveru
     * @param  {Object} conf Konfigurace spojeni
     */
    this.connectToStockServer = function(conf) {
        var addr = conf.addr + ":" + conf.port;
        log.message(("Connecting to stock server " + addr).yellow);

        addr = "http://"+addr;
        STOCK_SOCK = socketIO.connect(
            addr, {
                'force new connection': true,
                'reconnection delay': 100, // defaults to 500
                'reconnection limit': Infinity, // defaults to Infinity
                'max reconnection attempts': Infinity // defaults to 10
            }
        );

        STOCK_SOCK.on('updatedStockList', BROKER.updatedStockList);
        STOCK_SOCK.on('orderProcessed', BROKER.orderProcessed);
        STOCK_SOCK.on('orderCancelled', BROKER.orderCancelled);
        STOCK_SOCK.on('orderExpired', BROKER.orderExpired);

        STOCK_SOCK.on('connect', BROKER_SERVER.onConnected);
        STOCK_SOCK.on('disconnect', BROKER_SERVER.onDisconnected);
    };

    // v interalu 1 sec se pokousime pripojit k serveru
    IntConnection = setInterval(function() {

        BROKER_SERVER.connectToStockServer(app.get("stock"));
    }, INT_BROKER_CONNECT);

    return this;
};

// singleton trida 
Stock.instance = null;
module.exports = function(server, io) {
    if (Stock.instance === null) {
        Stock.instance = new Stock(server, io);
    }
    return Stock.instance;
};