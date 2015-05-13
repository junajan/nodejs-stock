var log = require("./modules/Log")("MarketServer", true, true);

var MarketServer = function stockServer(server, app) {
    var io = require('socket.io').listen(server);
    var STOCK_API = require("./modules/MarketApi.js")(app);

    io.sockets.on('connection', function(socket) {
        STOCK_API.onConnect(socket);

        socket.on('authenticate', STOCK_API.call(STOCK_API.authenticate, 'authenticate', socket, true));
        socket.on('reconnect', STOCK_API.call(STOCK_API.onReconnect, 'reconnect', socket));
        socket.on('setOrder', STOCK_API.call(STOCK_API.setOrder, 'setOrder', socket));
        socket.on('getMyInfo', STOCK_API.call(STOCK_API.getMyInfo, 'getMyInfo', socket));
        socket.on('getOrderStatus', STOCK_API.call(STOCK_API.getOrderStatus, 'getOrderStatus', socket));
        socket.on('cancelOrder', STOCK_API.call(STOCK_API.cancelOrder, 'cancelOrder', socket));
        socket.on('getMarketStatus', STOCK_API.call(STOCK_API.getMarketStatus, 'getMarketStatus', socket));

        socket.on('getStockInfo', STOCK_API.call(STOCK_API.getStockInfo, 'getStockInfo', socket));
        socket.on('disconnect', STOCK_API.call(STOCK_API.brokerDisconnected, "disconnect", socket, true));

        socket.on('error', function(err) {
            log.error("SocketIO error ", err.toString());
        });
    });
};

var instance = null;
module.exports = function(server, io) {

    if (instance === null)
        instance = new MarketServer(server, io);
    return instance;
};