var serverStatus = require("../modules/serverStatus")();

var Stock = require("../mongoose/stock");
var StockList = require("../mongoose/stockList");
var log = require("./log")(true, true, "RobotUi");
var async = require("async");
var http = require("http");
var _ = require("underscore");
var Order = require("../mongoose/order");
var MyStock = require("../mongoose/mystock");
var History = require("../mongoose/history");

var Events = require("./events");

var ROBOT_PROCESS_INTERVAL = 1000;
var trade_only_codes = [ "AAPL" ];

var RobotUi = function(app, STOCK) {
    console.log("Loading ROBOT UI");

    var ROBOT = this;
    var STOCK_OWNED = {};
    var STOCK_ORDER_BUY = {};

    function getRandomInt(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

       /**
     * Zaokrouhli cislo na dane tick size (granularitu)
     */
    function getRoundedPrice ( tickSize, tickSizeCount, referencePrice, price ) {

        var c = price / tickSize
        var des = c - parseInt ( c ) 
        
        if ( des > 0 ) {
            // cena neni v rozmeru tick size
            // zaokrouhlime ji k referencni cene
            
            if ( price < referencePrice )
                price = price - (price % tickSize ) + tickSize;
            else
                price = price - (price % tickSize );
        }

        return parseFloat(price).toFixed( tickSizeCount );
    }

    this.loadOwnedStock = function () {

        MyStock.find({ amount: { $gt: 0 }}, function ( err, data ) {

            // console.dir ( data );
            for ( i in data ) {
                item = data[i];

                if ( ! ( item.code in STOCK_OWNED )) {

                    STOCK_OWNED[item.code] = item;
                } else {

                   STOCK_OWNED[item.code].amount += item.amount;
                   STOCK_OWNED[item.code].originalAmount += item.originalAmount;
                }
            }

            Events.emit("loadedUI");
        });
    }

    this.buyStock = function ( code, price, amount ) {

        var priceSum = parseFloat ( ( price * amount ).toFixed(2) );
        var buyOrder = {
            type: 1,
            code: code,
            price: price,
            priceSumValue: priceSum,
            amount: amount
        }

        STOCK.addBuyOrder ( buyOrder, function ( err, res ) {

            if ( ! err ) {

                if ( ! ( buyOrder.code in STOCK_ORDER_BUY )) {

                    STOCK_ORDER_BUY[buyOrder.code] = {};
                    STOCK_ORDER_BUY[buyOrder.code].amount = 0;
                }
                
                STOCK_ORDER_BUY[buyOrder.code].amount += buyOrder.amount;
            } else {

                log.message(("Buy order nebyl prijat: " + err ).red );
            }
        });
    }

    this.sellStock = function ( code, price, amount ) {

        var priceSum = parseFloat ( ( price * amount ).toFixed(2) );
        var sellOrder = {
            type: 0,
            code: code,
            price: price,
            priceSumValue: priceSum,
            amount: amount
        }
        
        STOCK_OWNED[sellOrder.code].amount -= sellOrder.amount;

        STOCK.sellStock ( sellOrder, function ( err, res ) {

            if ( ! err ) {

                if ( sellOrder.code in STOCK_ORDER_BUY ) {

                }
            } else {

                STOCK_OWNED[sellOrder.code].amount += sellOrder.amount;
                log.message(("Sell order nebyl prijat: " + err ).red );
            }
        });
    }

    function robotProcess () {

        if ( ! serverStatus.get("authenticated") )
            return false;
        
        var actualStock = STOCK.getStocks();

        // projed nakoupene akcie, pokud nejaka klesla moc, tak ji prodej
        for ( i in STOCK_OWNED ) {
            item = STOCK_OWNED[i];

            if ( ! ( item.code in actualStock) )
                continue;

            amount = getRandomInt ( 1, item.amount );
            if ( getRandomInt (0, 1))
                percentChange = -1 * getRandomInt( 0, 50 ) / 10;
            else
                percentChange = getRandomInt( 0, 50 ) / 10;

            price = parseFloat ( ( item.price + item.price / 100 * percentChange ).toFixed(2) );
            ROBOT.sellStock ( item.code, price, amount );
        }

        // nakup akcii
        for ( code in actualStock ) {
            item = actualStock[code];
            item.price = parseFloat( item.price );

            // continue;

            if ( trade_only_codes.indexOf(code) === -1 )
                continue;

            // if ( code in STOCK_ORDER_BUY )
            //     continue;

            if ( getRandomInt ( 0, 2 )  ) {

                amount = getRandomInt ( 1, 50 );
                if ( getRandomInt (0, 1))
                    percentChange = getRandomInt( 0, 50 ) / 10;
                else
                    percentChange = -1 * getRandomInt( 0, 50 ) / 10;

                price = parseFloat ( ( item.price + item.price / 100 * percentChange ).toFixed(2) );

                ROBOT.buyStock ( code, price, amount );
            }
        }
    }

    function startRobot () {
        log.message ( "Starting robot".yellow );

        setInterval( robotProcess, ROBOT_PROCESS_INTERVAL );
    }


    this.init = function () {
        Events.on("loadedUI", startRobot );

        this.loadOwnedStock();
    }

    this.runOrders = function() {

        return false;

        console.log("Testing orders".blue);
        if (TestOrders)
            clearInterval(TestOrders);

        TestOrders = setInterval(function() {

            if (!SOCKET || !SOCKET.socket || !SOCKET.socket.connected)
                return false;

            type = parseInt((Math.random() * 100) % 2);

            code = "GOOG";
            data = {
                type: type,
                code: code,
                price: 1000 + 1000 / 1000 * (Math.random() * 100),
                amount: 1 + parseInt(((Math.random() * 100) % 100))
            }

            console.dir(data);
            c = SOCKET.emit("setOrder", data, function(res) {

                console.log("Order result.. ");
                console.dir(res);
            });
        }, 1000);
    }


    this.init();

    return this;
}


RobotUi.instance = null;
module.exports = function(app, stock) {

    if (!RobotUi.instance)
        RobotUi.instance = new RobotUi(app, stock );

    return RobotUi.instance;
}