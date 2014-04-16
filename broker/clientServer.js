var colors = require("colors");
var _ = require("underscore");
var http = require ( "http" );
var async = require ( "async" );

var StockServer = function stockServer( server, app ){

    // IO socket - rozhrani pro prenos zprav
    var io = require('socket.io').listen(server, { log: false });
    
    var CLIENT_SOCK_API = require("./modules/clientSocketApi")( app, io );

    // trida udrzujici informace o spojeni
    io.sockets.on('connection', function(socket) {
        CLIENT_SOCK_API.onConnect ( socket );
        
        socket.on('authenticate', CLIENT_SOCK_API.call ( CLIENT_SOCK_API.authenticate, 'authenticate', socket, true ));
        socket.on('reconnect', CLIENT_SOCK_API.call ( CLIENT_SOCK_API.onReconnect, 'reconnect', socket ));
        socket.on('msg', CLIENT_SOCK_API.call ( CLIENT_SOCK_API.onMsg, 'msg', socket ));
        socket.on('getStatus', CLIENT_SOCK_API.call ( CLIENT_SOCK_API.getStatus, 'getStatus', socket ));
        socket.on('disconnect', CLIENT_SOCK_API.call ( CLIENT_SOCK_API.clientDisconnected, "disconnect", socket, true ) );

        socket.on('error', function ( err ) {
            console.log ( "SocketIO Error: " + err.toString());
        });
    });
}

instance = null;
module.exports = function( server, app ){
    if(instance === null){
        instance = new StockServer( server, app );
    }
    return instance;
}
