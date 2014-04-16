var colors = require( "colors" );
var log = require ( "../modules/log") ( true, true );
var _ = require ("underscore" );
var DB = require ( "./db")();

var INTERVAL_SEC = 1;
var MAX_ENTRY_COUNT = 80;

function MarketApi ( app ) {
    var STOCK = this;

    var stockList = {};
    var data = {};

    var defaultState = {
        1: { data: [], lastChange: 0 },
        30: { data: [], lastChange: 0 },
        450: { data: [], lastChange: 0 }
    };

    var dataCount = {};
    var lastTime = 0;

    this.call = function ( f, evName, socket, authOnly ) {

        return function(d, cb) {

            try { 

                // authenticated only!
                if ( ! authOnly && ! socket.auth )
                    f = STOCK.unauthenticated;

                log.event(evName, d);

                if (_.isFunction(d)) {
                    cb = d;
                    d = null;
                }

                if ( ! _.isFunction ( cb ) )
                    cb = function () {}

                if (_.isFunction(f))
                    f(d, cb, socket, evName );

            } catch ( e ) {

                log.message ( ("ERROR: " + e ).red );
            }
        }
    }

    this.onConnect = function ( socket ) {

        console.log ( "Client connected".yellow );
    }

    this.onReconnect = function ( data, cb, socket ) {

        console.log ( "Client reconnected".yellow );
    }

    this.clientDisconnected = function (data, cb, socket) {

        log.message ( "Client has just disconnected".yellow );
    }

    function readNewEntry () {

        // console.dir ( lastTime );
        DB.stock_history.find( { date: { $gt: lastTime }}, function (err, res ) {

            var item = 0;

            if ( err )
                return console.dir ( err );

            // console.dir ( res );

            if ( ! res.length )
                return false;

            var len = res.length;
            var updatedStocks = {};

            if ( res ) for ( var i = 0; i < len; i++ ) {
                item = res[i];
                var code = stockList[ item.stock_id ].code;
                
                addEntry ( code, item.date, item.finalPrice, item.finalAmount, item.priceChange );
                updatedStocks[code] = 1;
            }

            for ( i in updatedStocks ) {

                data[i][1].data = removeOldData ( data[i][1].data );
                data[i][30].data = removeOldData ( data[i][30].data );
                data[i][450].data = removeOldData ( data[i][450].data );
                // console.dir ( i + ": "+ data[i][300].data.length );

            }
            lastTime = item.date;
        });
    }

    function init () {

        DB.stocks.find ( {}, function ( err, res ) {

            if ( err || ! res.length ) 
                return false;

            for ( i in res ) {

                stockList[ res[i]._id ] = res[i];
                data[ res[i].code ] = JSON.parse ( JSON.stringify ( defaultState ));
            }

            readNewEntry();
            setInterval( readNewEntry, 1000 );
            
        });
    }

    function removeOldData ( d, maxAge ) {

        if ( d.length > d.length - MAX_ENTRY_COUNT )
            d = d.slice ( d.length - MAX_ENTRY_COUNT );

        return d;
    }

    /**
     * Prida zaznam do pole a vyresi agregaci zaznamu
     * @param {Number} aggSize       Pocet sekund, po kterych se maji zaznamy agregovat
     * @param {Number} price         Zobchodovana cena
     * @param {Number} amount        Zobchodovane mnozstvi
     * @param {Number} maxAge        Pocet sekund urcujici maximalni stari zaznamu v tabulce
     */
    function addAggregatedEntry ( aggSize, code, ind, time, price, amount, priceChange ) {

        var insert = true;
        var d = data[code][ind].data;

        if ( d.length ) {

            var ind = d.length-1;
            // last = d[ind];

            if ( d[ind][0] > time - aggSize * 1000 ) {
                
                if ( isNaN ( parseFloat( price ) ))
                    price = 0;

                d[ind][1] += parseFloat( price );
                d[ind][2] += parseFloat( amount );
                d[ind][3] ++;

                return d;
            }
        }

        if ( insert )
            d.push ( [ time, parseFloat(price), parseFloat(amount), 1]);

        return d;
    }

    function addEntry ( stockCode, time, price, amount, priceChange ) {

        data[stockCode][1].data = addAggregatedEntry ( 1, stockCode, 1, time, price, amount, priceChange );
        data[stockCode][30].data = addAggregatedEntry ( 30, stockCode, 30, time, price, amount, priceChange );
        data[stockCode][450].data = addAggregatedEntry ( 15 * 60, stockCode, 450, time, price, amount, priceChange );

        // console.dir ( data[stockCode][300] );

        data[stockCode][1].lastChange = priceChange;
        data[stockCode][30].lastChange = priceChange;
        data[stockCode][450].lastChange = priceChange;
    }

    this.getChartData = function ( code, aggregation, from ) {
        if ( ! from )
            from = 0;

        // console.log ( "Return graph "+ code + " with aggreg: " + aggregation + " offset: " + from );
        // console.dir ( data[code][aggregation] );

        if ( from ) {

            d = { lastChange: data[code][aggregation].lastChange };
            d.data = [];
            var i = data[code][aggregation].data.length - 1;

            // console.log ( "Last time: " + data[code][aggregation].data[i][0] );

            if ( data[code][aggregation].data[i][0] <= from )
                d.data = [];
            else {

                for ( ; i >= 0; i-- ) {
                    if ( from <= data[code][aggregation].data[i][0] )
                        break;
                }

                d.data = data[code][aggregation].data.slice ( i );
            }

            return d;
        }

        return data[code][aggregation];
    }

    init();

    return this;
}

MarketApi.instance = null;
module.exports = function ( app ) {
    
    if ( MarketApi.instance == null )
        MarketApi.instance = new MarketApi ( app );

    return MarketApi.instance;
}
