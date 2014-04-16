var colors = require( "colors" );
var log = require ( "../modules/log") ( true, true, "SocketApi" );
var _ = require ("underscore" );
var Client = require("../mongoose/client");
var serverStatus = require ("./serverStatus")();

var Events = require("./events");


function ClientSocketApi ( app, io ) {
    CLIENT_SOCKET_API = this;

    var REST = require('./clientApi') ( app );
    var BROKER = require('./marketClient') ( app );
    
    Events.on("serverChange", function (){ 

        CLIENT_SOCKET_API.sendAllStatusInfo();
    });

    this.call = function ( f, evName, socket, authOnly ) {

        return function(d, cb) {

            // authenticated only!
            if ( ! authOnly && ! socket.auth )
                f = CLIENT_SOCKET_API.unauthenticated;

            log.event(evName, d);

            if (_.isFunction(d)) {
                cb = d;
                d = null;
            }

            if ( ! _.isFunction ( cb ) )
                cb = function () {}

            if (_.isFunction(f))
                f(d, cb, socket, evName );
        }
    }

    function testHistory ( socket ) {

        setInterval( function () {

            REST.getClientUnreadedHistory ( socket.user._id, function ( data, len ) {

                dataOut = {
                    data: data,
                    len: len
                }

                socket.emit("unreaded", dataOut );
            });

        }, 2000);
    }

    this.sendAllStatusInfo = function () {

        var data = BROKER.getServerStatusInfo();
        io.sockets.emit("serverInfo", data );
    }

    this.sendStatusInfo = function ( socket ) {

        var data = BROKER.getServerStatusInfo();
        socket.emit("serverInfo", data );
    }

    this.authenticate = function ( key, cb, socket ) {

        console.log ( ("Authenticating client " + key).yellow );

        var client = REST.getClientByKey( key );
        if ( client ) {

            socket.authKey = key;
            socket.auth = true;
            socket.user = client;

            REST.addClientSocketKey ( socket.user._id, socket );

            log.message ( ("Client ("+ client.name +") connected to realtime api").green );


            CLIENT_SOCKET_API.sendStatusInfo ( socket );
            testHistory ( socket );

            return cb ( { res: 1 } );
        }
        return cb ( { res: "Neznámý klíč"});
    }

    this.unauthenticated = function ( data, cb, socket ) {

        console.log ( "Unauthenticated client".red );

        if ( cb ) 
            cb (  { unauthenticated: 1 } );
        socket.disconnect();
    }

    this.onConnect = function ( socket ) {

        log.message ( "Realtime client connected".yellow );
    }

    this.onReconnect = function ( data, cb, socket ) {

        console.log ( "Client reconnected".yellow );
    }

    this.onMsg = function ( data, cb, socket ) {
        console.log ( "Client sending data: "+ JSON.stringify ( data ));
        cb ( "OK" );
    }

    this.clientDisconnected = function (data, cb, socket) {

        log.message ( "Client has just disconnected".yellow );

        if ( socket.auth )
            REST.removeClientSocketKey ( socket.user._id, socket );
    }

    return this;
}

ClientSocketApi.instance = null;
module.exports = function ( app, io ) {
    
    if ( ClientSocketApi.instance == null )
        ClientSocketApi.instance = new ClientSocketApi ( app, io );

    return ClientSocketApi.instance;
}
