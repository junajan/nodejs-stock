var colors = require( "colors" );
var log = require ( "../modules/log") ( true, true );
var _ = require ("underscore" );
var DB = require ( "./db")();
var ObjectId = require('mongojs').ObjectId;


function MarketApi ( app ) {
    STOCK = this;

    var BrokerSockets = {};
    var MarketCore = require("./marketCore")( app, STOCK );

    this.call = function ( f, evName, socket, authOnly ) {

        return function(d, cb) {

            // authenticated only!
            if ( ! authOnly && ! socket.auth ) {

                return STOCK.unauthenticated ( d, cb, socket, evName );
            }

            log.event(evName, d);

            if (_.isFunction(d)) {
                cb = d;
                d = null;
            }

            if ( ! _.isFunction ( cb ) )
                cb = function () {}

            if (_.isFunction(f)) {

                f(d, cb, socket, evName );
            }
        }
    }

    this.sendBrokersChangedPrices = function ( data ) {

        for ( i in BrokerSockets )
            BrokerSockets[i].emit("priceChanged", {data:data});
    }

    this.sendBrokerNotice = function ( broker_id, data, cb ) {

        if ( broker_id < 1 )
            return cb ( true );

        if ( BrokerSockets[broker_id] ) {

            if ( data.sendDate && data.sendDate + 5 * 1000 > Date.now() )
                return;

            data.sendDate = Date.now();

            log.message(("Sending acknowledgement for order "+ data._id).yellow);
            BrokerSockets[broker_id].emit( "orderProcessed", data, cb);
        }
    }

    this.authenticate = function ( data, cb, socket ) {
        
        var checkForHexRegExp = new RegExp("^[0-9a-fA-F]{24}$");


        if ( ! String( data.id ).match( checkForHexRegExp ) )
            return cb ( { res: "bad_credentials" } );


        DB.brokers.findOne({ _id: ObjectId(data.id) }, function ( err, res ) {
            
            console.log ( ("Authenticating broker " + res.name).yellow );

            if ( err )
                return console.dir ( err );

            if ( ! res || res.secret !== data.secret )
                return cb ( { res: "bad_credentials" } );

            cb ( { res: "authenticated" } );
            socket.auth = res;

            var inc = {
                broker_id: res._id,
                date: Date.now()
            }

            BrokerSockets[ res._id ] = socket;

            DB.broker_connections.insert ( inc );
            console.log ( ("Broker " + data.name+" was authenticated").green );
        });
    }

    this.unauthenticated = function ( data, cb, socket ) {

        console.log ( "Unauthenticated broker".red );

        if ( cb ) 
            cb (  { unauthenticated: 1 } );
        // socket.disconnect();
    }

    this.onConnect = function ( socket ) {

        console.log ( "Client connected".yellow );
    }

    this.onReconnect = function ( data, cb, socket ) {

        console.log ( "Client reconnected".yellow );
    }

    this.onMsg = function ( data, cb, socket ) {
        console.log ( "Client sending data: "+ JSON.stringify ( data ));
        cb ( "OK" );
    }

    this.setOrder  = function ( order, cb, socket ) {

        console.log ( "Client sending order: "+ JSON.stringify ( order ));

        // test order
        status = MarketCore.isOrderApproved ( order );
        switch ( status ) {

            case 1:
                return cb ( { res: "bad_company_code", error: "Bad company code." });
            case 2:
                return cb ( { res: "bad_price", error: "Bad price." });
            case 3:
                return cb ( { res: "bad_amount", error: "Broker does not have enought amount for this stock." });
            case 4:
                return cb ( { res: "bad_type", error: "Bad type: " + order.type });
        }

        var dataIn = {
            code: order.code,
            price: order.price,
            amount: order.amount,
            finished_amount: 0,
            type: order.type,
            broker: socket.auth.id,
            broker_id: socket.auth._id
        }

        MarketCore.addOrder ( dataIn, function ( res ) {
            
            if ( res ) 
                cb ( { res: "accepted", id: res._id });
            else
                cb ( { res: "core_error" });
        });
    }

    this.getStockInfo = function ( data, cb, socket ) {

        cb ( MarketCore.getStockList () );
    }

    this.clientDisconnected = function (data, cb, socket) {

        log.message ( "Client has just disconnected".yellow );

        if ( socket.auth && socket.auth._id )
            delete BrokerSockets[ socket.auth._id ];
    }

    this.getOnlineBrokers = function () {

        return BrokerSockets;
    }

    return this;
}

MarketApi.instance = null;
module.exports = function ( app ) {
    
    if ( MarketApi.instance == null )
        MarketApi.instance = new MarketApi ( app );

    return MarketApi.instance;
}
