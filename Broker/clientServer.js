var colors = require("colors");

var ClientServer = function ClientServer( server, app ){

    // IO socket - rozhrani pro prenos zprav
    var io = require('socket.io').listen(server, { log: false });
    var ClientSocketApi = require("./modules/clientSocketApi")( app, io );

    // trida udrzujici informace o spojeni
    io.sockets.on('connection', function(socket) {
        ClientSocketApi.onConnect ( socket );
        
        socket.on('authenticate', ClientSocketApi.call ( ClientSocketApi.authenticate, 'authenticate', socket, true ));
        socket.on('reconnect', ClientSocketApi.call ( ClientSocketApi.onReconnect, 'reconnect', socket ));
        socket.on('msg', ClientSocketApi.call ( ClientSocketApi.onMsg, 'msg', socket ));
        socket.on('getStatus', ClientSocketApi.call ( ClientSocketApi.getStatus, 'getStatus', socket ));
        socket.on('disconnect', ClientSocketApi.call ( ClientSocketApi.clientDisconnected, "disconnect", socket, true ) );

        socket.on('error', function ( err ) {
            console.log ( "SocketIO Error: " + err.toString());
        });
    });
};

ClientServer.instance = null;
module.exports = function( server, app ){
    if(ClientServer.instance === null){
        ClientServer.instance = new ClientServer( server, app );
    }
    return ClientServer.instance;
};
