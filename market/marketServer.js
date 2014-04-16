var colors = require("colors");
var _ = require("underscore");
var http = require ( "http" );
var async = require ( "async" );

var StockServer = function stockServer( server, app ){

    var STOCK_API = require("./modules/marketApi.js")(app);

    // IO socket - rozhrani pro prenos zprav
    io = require('socket.io').listen(server, { log: false });

    // trida udrzujici informace o spojeni
    io.sockets.on('connection', function(socket) {
        STOCK_API.onConnect ( socket );
        
        socket.on('authenticate', STOCK_API.call ( STOCK_API.authenticate, 'authenticate', socket, true ));
        socket.on('reconnect', STOCK_API.call ( STOCK_API.onReconnect, 'reconnect', socket ));
        socket.on('msg', STOCK_API.call ( STOCK_API.onMsg, 'msg', socket ));
        socket.on('setOrder', STOCK_API.call ( STOCK_API.setOrder, 'setOrder', socket ));
        socket.on('cancelOrder', STOCK_API.call ( STOCK_API.cancelOrder, 'cancelOrder', socket ));
        socket.on('getStatus', STOCK_API.call ( STOCK_API.getStatus, 'getStatus', socket ));
        socket.on('getStockInfo', STOCK_API.call ( STOCK_API.getStockInfo, 'getStockInfo', socket ));
        socket.on('disconnect', STOCK_API.call ( STOCK_API.clientDisconnected, "disconnect", socket, true ) );

        socket.on('error', function ( err ) {
            console.log ( "SocketIO Error: " + err.toString());
        });
    });
}

instance = null;
module.exports = function( server, io ){
    if(instance === null){
        instance = new StockServer( server, io );
    }
    return instance;
}
