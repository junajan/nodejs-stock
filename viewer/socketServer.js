var colors = require("colors");
var _ = require("underscore");
var http = require ( "http" );
var async = require ( "async" );

var StockServer = function stockServer( server, app ){

    var STOCK_API = require("./modules/viewerApi.js")(app);

    // IO socket - rozhrani pro prenos zprav
    io = require('socket.io').listen(server, { log: false });

    // trida udrzujici informace o spojeni
    io.sockets.on('connection', function(socket) {
        STOCK_API.onConnect ( socket );
        
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
