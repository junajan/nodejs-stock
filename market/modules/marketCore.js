var colors = require("colors");
var log = require("../modules/log")(true, true);
var _ = require("underscore");
var DB = require("./db")();
var OrderBook = require('./orderBook')();
var events = require('events');
var async = require('async');
var eventEmitter = new events.EventEmitter();
var ObjectId = require('mongojs').ObjectId;
 

// typy prikazu, ktere burza prijma
var ORDER_TYPES = { "buy": 1, "sell": 0 };
var ORDER_MATCHING_DELAY = 900;
var TEST_PROCESS_FINISH;
TEST_PROCESS_FINISH = true;
TEST_PROCESS_FINISH = false;

/**
 * Spocita desitkovy nasobek, kterym musime vynasobit tick size
 * aby z nej vyslo cele cislo
 */
function getTickSizeCount ( tickSize ){

    i = 1;
    count = 0;
    while ( true ) {

        if ( parseInt( tickSize * i ) / i == tickSize )
            break;

        // minimalni velikost ticku bude 1 tisicina
        if ( i > 1000 )
            throw "Bad tick size!";

        i *= 10;
        count++;
    }
    
    return count;
}

var MarketCore = function MarketCore( app, MARKET_API ) {
    
    var INFO = {};
    // pocet milisekund v kterych se opakuje order matching algoritmus
    var ORDER_MATCHING_INTERVAL = app.get("config").order_matching_interval;

    // maximalni rozpeti cen je 30% od referencni ceny
    var PRICE_ALLOWED_CHANGE = app.get("config").price_alowed_change;

    // granuralita ceny
    var TICK_SIZE  = app.get("config").tick_size;

    // specialni broker urceny k emisi akcii
    var EMISSION_BROKER = app.get("config").emission_broker;

    MarketCore = this;
    var StockList = {};
    var StockOrders = {};
    var StockOrdersProccess = {};
    var intOrderMatching = false;
    var tickSizeCount = getTickSizeCount ( TICK_SIZE );
    var brokerNoticesPriceChange = {};
    var brokerNotices = {};

    log.message ( "Loading market core".yellow );

    /**
     * Zaokrouhli cislo na dane tick size (granularitu)
     */brokerNoticesPriceChange
    function getRoundedPrice ( tickSize, tickSizeCount, referencePrice, price ) {

        var c = price / tickSize
        var des = c - parseInt ( c ) 
        // console.log ( des );
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

    /**
     * Nastavi zakladni atributy u spolecnosti
     * @param  {String} code Kod spolecnosti
     */
    var initStockItem = function ( code ) {

        StockList[ code ].amountOrdersItemsBuy = 0;
        StockList[ code ].amountOrdersItemsSell = 0;
        StockList[ code ].amountOrdersBuy = 0;
        StockList[ code ].amountOrdersSell = 0;
        StockList[ code ].priceChange = 0;

        StockOrders[ code ] = { buy: [], sell: [] };
    }

    /**
     * Nacte akcie a jejich posledni stav z databaze
     */
    var loadStockList = function () {

        DB.stocks.find ({}, function ( err, res ) {

            if ( err )
                return console.dir ( err );

            if ( ! res.length ) 
                return log.message ( "No companies to trade in DB".red );

            for ( i = 0; i < res.length; i++ ) {

                StockList[ res[i].code ] = res[i];

                StockList[ res[i].code ].price = getRoundedPrice ( TICK_SIZE, tickSizeCount, 0, StockList[ res[i].code ].price );
                initStockItem ( res[i].code );
            }

            loadUnfinishedOrders();
        });
    }

    // ==============================================
    // ================= Public API =================
    // ==============================================
    
    /**
     * Odesle brokerovi notifikaci o zmene ceny spolecnosti
     */
    function sendBrokerNoticesPriceChange () {

        // console.dir ( brokerNoticesPriceChange );
        MARKET_API.sendBrokersChangedPrices ( brokerNoticesPriceChange );
    }

    /**
     * Posle brokerovi upozorneni o vyrizenem prikazu
     * @param  {Object} info Informace o notifikaci
     */
    function sendBrokerNoticeItem ( info ) {

        // odesle brokerovi notifikaci
        // pokud broker neni pripojeny, neprovede se callback funkce => notifikace se odesle v intervalu znovu
        MARKET_API.sendBrokerNotice ( info.broker_id, info, function ( res ) {

            // pokud broker vrati false hodnotu (neprijal notifikaci)
            if ( ! res )
                return log.message ( ("Broker("+info.broker+") does not accept stock order result!").red );

            // broker prijal notifikaci => vyradime ji z naseho seznamu k odeslani
            DB.orders_finished.update({ _id: info._id }, {  $set: { broker_noticed: true }}, function ( err, res ) {

                // pokud se nepodarilo updatovat notifikaci v databazi
                if ( err ) 
                    return log.message ( "Broker order acception was not properly saved to DB".red );

                // vyradime notfikaci ze seznamu
                delete brokerNotices[info._id];
                log.message(("Broker("+info.broker_id+") accepted order result").yellow );
            });
        });
    }

    /**
     * Projede vsechny notifikace k odeslani a rozposle je brokerum
     */
    function sendBrokerNotice() {

        // vsechny notifikace
        for ( i in brokerNotices ) {

            // odesle danemu brokerovi
            sendBrokerNoticeItem ( brokerNotices[i] );
        }
    }

    /**
     * Zjisti, jestli je prikaz v mezich a je validni
     * @param  {Object}  order  Data prikazu
     * @param  {Object}  broker Broker pro ktereho se provadi testy
     * @return {Number}  Priznak, zda je prikaz validni
     */
    this.isOrderApproved = function ( order, broker ) {

        // pokud je prikaz na neexistujici spolecnost
        if ( ! StockList[ order.code ] )
            return 1;
        
        // pokud neexistuje typ prikazu
        if ( order.type != 1 && order.type != 0 )
            return 4;

        // zjisti maximalni a minimalni cenu - podle max rozpeti ceny
        maxPrice = StockList[ order.code ].price / 100 * (100 + PRICE_ALLOWED_CHANGE );
        minPrice = StockList[ order.code ].price / 100 * (100 - PRICE_ALLOWED_CHANGE );

        // zaokrouhli cenu prikazu na tick size
        order.price = getRoundedPrice ( TICK_SIZE, tickSizeCount, 0, order.price );
        
        // porovna, zda se cena vejde do max a min rozpeti
        if ( order.price < minPrice || order.price > maxPrice )
            return 2;

        // tetsuje, zda ma broker dostatecne prostredky pro prodej akcii
        // if ( ORDER_TYPES["sell"] == order.type && order.amount > BrokersStocks[ broker ][order.code].amount );
            // return 3;

        // pokud prikaz projde kontrolou, vrati 0 = validni
        return 0;
    }

    /**
     * Stock list getter
     * @return {Object} Vraci seznam obchodovatelnych polozek
     */
    this.getStockList = function () {

        return StockList;
    }

    /**
     * Stock orders getter
     * @return {Object} Vraci seznam prikazu pro danou spolecnost
     */
    this.getStockOrders = function ( stock ) {

        return StockOrders[ stock ];
    }

    /**
     * Prida/upravi spolecnost
     * @param {Object}   data Info o spolecnosti
     * @param {Function} cb   Callback funkce, ktera se provede pri pridani
     */
    this.addStock = function ( data, cb ) {

        // data pro insert do databaze
        dataIn = {
            name: data.name,
            code: data.code,
            amount: parseInt( data.amount ),
            price: data.price
        }

        // pokud neni v parametrech codeOld (nejde o update, doplni se vlastni)
        if ( ! data.codeOld )
            data.codeOld = data.code;

        // insert dat s novou spolecnosti
        DB.stocks.update ( { code: dataIn.code }, { $set: dataIn}, { upsert: true }, function ( err, res ) {
            
            // pokud nedoslo k chybe, prida se spolecnost i do lokalniho seznamu
            if ( ! err && res.upserted && res.n == 1 ) {

                StockList[dataIn.code] = dataIn;
                StockList[dataIn.code]._id = res.upserted;
            } else {

                for ( i in dataIn )
                    StockList[dataIn.code][i] = dataIn[i];
            }
                        
            // vrat info o provedene operaci
            cb ( err );
        });
    }

    /**
     * Pomoci binarniho puleni vrat index v poli tak, aby po pridani
     * hodnoty bylo pole serazene vzestupne
     * @param  object array pole s predchozimi prvky
     * @param  float value Cena noveho prvku
     * @return int 
     */
    var getInsertionIndexUp = function (array, value) {
        
        var low = 0,
        high = array.length;

        while (low < high) {
            var mid = low + high >>> 1;
            if ( array[mid].price < value) low = mid + 1;
            else high = mid;
        }
        return low;
    }

    /**
     * Prida prikaz do fronty serazene podle ceny
     * @param {Object} item Prikaz
     * @param {String} code Kod spolecnosti
     */
    var addOrderItem = function ( item, code ) {

        if ( item.type == ORDER_TYPES["sell"] ) {  // pridej do sell fronty
            
            // serad vzestupne
            ind = getInsertionIndexUp ( StockOrders[code].sell, item.price );
            StockOrders[code].sell.splice(ind, 0, item );

            StockList[code].amountOrdersSell++;
            StockList[code].amountOrdersItemsSell += parseInt( item.amount - item.finished_amount );
            if ( ! StockList[code].bestSellPrice || item.price < StockList[code].bestSellPrice )
                StockList[code].bestSellPrice = item.price
            
        } else { // buy

            // serad sestupne
            ind = getInsertionIndexUp ( StockOrders[code].buy, item.price );
            StockOrders[code].buy.splice(ind, 0, item );

            StockList[code].amountOrdersBuy++;
            StockList[code].amountOrdersItemsBuy += parseInt( item.amount - item.finished_amount );
            if ( ! StockList[code].bestBuyPrice || item.price > StockList[code].bestBuyPrice )
                StockList[code].bestBuyPrice = item.price
        }
    }

    /**
     * Updatuje mnozstvi akcii od spolecnosti u daneho brokera
     * @param {String}   broker_id Broker ID
     * @param {String}   code      Stock code
     * @param {Number}   amount    Pocet akcii spolecnosti, ktere broker vlastni
     */
    var addBrokerStock = function ( broker_id, code, amount, cb ) {

        dataIn = {
            code: code,
            broker_id: broker_id,
            amount: amount
        }

        DB.broker_stocks.update({broker_id: broker_id, code: code}, dataIn, {upsert:true}, cb );
    }

    /**
     * Prida prikaz ke zpracovani
     * @param {Object}   order Data s prikazem
     * @param {Function} cb    Callback, ktery se zavola pri pridani prikazu
     */
    var addOrder = this.addOrder = function ( order, cb ) {

        log.message ( "Adding order".yellow );

        // write to DB
        DB.orders.insert ( order, function ( err, res ) {

            if ( err )
                return cb ( false );

            // add to process
            // StockOrders[ order.code ][ order.type ].push ( order );
            // console.dir ( MarketCore );
            addOrderItem ( order, order.code );
            cb ( res );
        });
    }

    this.stockEmision = function ( order, cb ) {

        var dataIn = {
            code: order.code,
            price: order.price,
            amount: order.amount,
            finished_amount: 0,
            type: ORDER_TYPES["sell"] ,
            broker: EMISSION_BROKER.id,
            broker_id: EMISSION_BROKER._id
        }

        // pridej SELL prikaz
        addOrder ( dataIn, function ( r ) {

            addBrokerStock ( EMISSION_BROKER._id, order.code, order.amount, function ( res ) {

                if ( ! res ) {

                    DB.stocks.update ( { code:  dataIn.code }, { $inc : { amount : dataIn.amount } }, cb );
                    StockList[ dataIn.code ].amount += dataIn.amount;
                }
                else 
                    cb ( res );
            })
        });

        // zapis mnozstvi brokerovi
    }

    /**
     * Zrusi pridany prikaz
     * @param  {Object} order Prikaz ke zruseni
     */
    this.cancelOrder = function ( order ) {

        log.message ( "Canceling order".yellow );
        console.dir ( order );
    }

    /**
     * Odstrani ze seznamu prikazu jiz vycerpany prikaz
     */
    var removeOrderFromList = function ( list, ind ) {

        list.splice(ind, 1);
    }

    var clearStockOrdersItemBuy = function ( trade, orders, finalPrice, stock, orderTypeInd, doneAll ) {

        var list = orders.buy;

        var len = list.length;
        var ind = null;
        // pokud je polozka zobchodovana
        for ( var i = 0; i < len; i++ ) {

            if ( trade.buyId == list[i]._id ) {

                ind = i;
                break;
            }
        }

        if ( ind === null ) {

            console.log ( "Chyba - polozk na smazani nebyla nalezena".red );
            return done ( "Chyba - položka pro smazání nebyla nalezena v seznamu." );
        }

        var order = list[i];


        finishedItem = {
            order_id: order._id,
            processed_amount: trade.qty,
            date: Date.now(),
            price: finalPrice,
            broker_id: order.broker_id,
            broker_noticed: false
        }

        asyncTasks = [
            function ( done ) {
                //  uloz operaci do databaze

                DB.orders_finished.insert( finishedItem, function ( err, res ) {

                    brokerNotices[res._id] = res;
                    process.nextTick ( function () {
                        sendBrokerNotice();
                    });

                    done(err);
                });
            },
            function ( done ) {
                //     uprav stav prikazu - uprav zobchodovane mnozstvi prikazu

                var count = 0;
                count = trade.qty;
                StockList[ stock ].amountOrdersItemsBuy -= count;
                // order.finished_amount += count;

                if ( TEST_PROCESS_FINISH )
                    return done( false );
                DB.orders.update( { _id : order._id }, { $inc : { finished_amount : count } }, function ( err, res ) {

                    done(err);
                });
            },
            function ( done ) {
                //     uprav info o brokerovi - uprav mnozstvi, ktere broker ma k obchodovani
                
                var cb = function( err, res ) {

                    done(err);
                }

                addBrokerStock ( order.broker_id, order.code, trade.qty, cb );
            }
        ];

        async.parallel(asyncTasks, function(err){
            
            if ( err ) {
                log.error ( "Finished trade DB write error!" );
                // rollback changes
                
                done ( err );
            }
            
            // uprav stav prikazu
            order.finished_amount += trade.qty;

            // uprav info o brokerovi
            // nastav brokerovi + nebo - amount zobchodovane jednotky

            doneAll ( err );
        });
    }


    var clearStockOrdersItemSell = function ( trade, orders, finalPrice, stock, orderTypeInd, doneAll ) {

        var list = orders.sell;
        // console.dir ( list );

        var len = list.length;
        var ind = null;
        // pokud je polozka zobchodovana
        for ( var i = 0; i < len; i++ ) {

            if ( trade.sellId == list[i]._id ) {

                ind = i;
                break;
            }
        }

        if ( ind === null ) {

            return done ( "Chyba - položka pro smazání nebyla nalezena v seznamu." );
        }

        var order = list[i];

        finishedItem = {
            order_id: order._id,
            processed_amount: trade.qty,
            date: Date.now(),
            price: finalPrice,
            broker_id: order.broker_id,
            broker_noticed: false
        }

        var asyncTasks = [
            function ( done ) {
                //  uloz operaci do databaze

                DB.orders_finished.insert( finishedItem, function ( err, res ) {

                    brokerNotices[res._id] = res;
                    process.nextTick ( function () {
                        sendBrokerNotice();
                    });

                    done(err);
                });
            },
            function ( done ) {
                //     uprav stav prikazu - uprav zobchodovane mnozstvi prikazu

                var count = 0;
                count = trade.qty;
                StockList[ stock ].amountOrdersItemsSell -= count;
                // order.finished_amount += count;

                if ( TEST_PROCESS_FINISH )
                    return done( false );

                DB.orders.update( { _id : order._id }, { $inc : { finished_amount : count } }, function ( err, res ) {

                    done(err);
                });
            },
            function ( done ) {
                //     uprav info o brokerovi - uprav mnozstvi, ktere broker ma k obchodovani
                
                var cb = function( err, res ) {

                    done(err);
                }

                addBrokerStock ( order.broker_id, order.code, -1 * trade.qty, cb );
            }
        ];

        async.parallel(asyncTasks, function(err){
            
            if ( err ) {
                log.error ( "Finished trade DB write error!" );
                // rollback changes
                
                done ( err );
            }
            
            // console.log ( order.price + " -= " + trade.qty );
            // uprav stav prikazu
            order.finished_amount += trade.qty;

            // uprav info o brokerovi
            // nastav brokerovi + nebo - amount zobchodovane jednotky

            doneAll ( err );
        });
    }

    var clearStockOrdersBuy = function ( orders, finalTrades, finalPrice, stock, doneAll ) {

        // projed buy prikazy 
        async.each(finalTrades,
            function ( trade, cb ) {

                clearStockOrdersItemBuy ( trade, orders, finalPrice, stock, "buy", cb );
            }, 
            function(err){

                var i = orders.buy.length - 1;

                StockList[stock].bestBuyPrice = 0;
                for ( ; i >= 0; i-- ) {

                    if ( orders.buy[i].amount <= orders.buy[i].finished_amount ) {

                        StockList[ stock ].amountOrdersBuy--;
                        removeOrderFromList ( orders.buy, i );

                    } else {

                        if ( StockList[stock].bestBuyPrice < orders.buy[i].price )
                            StockList[stock].bestBuyPrice = orders.buy[i].price;
                    }
                }

                doneAll( err );
        });
    }

    var clearStockOrdersSell = function ( orders, finalTrades, finalPrice, stock, doneAll ) {
    
        // projed sell prikazy 
        async.each(finalTrades, 
            function ( trade, cb ) {

                clearStockOrdersItemSell ( trade, orders, finalPrice, stock, "sell", cb );
            }, 
            function(err){

                StockList[stock].bestSellPrice = 0;
                var i = orders.sell.length - 1;
                for ( ; i >= 0; i-- ) {

                    if ( orders.sell[i].amount <= orders.sell[i].finished_amount ) {
                        
                        StockList[ stock ].amountOrdersSell--;
                        removeOrderFromList ( orders.sell, i );

                    } else {

                        if ( StockList[stock].bestSellPrice == 0 || StockList[stock].bestSellPrice > orders.sell[i].price )
                            StockList[stock].bestSellPrice = orders.sell[i].price;
                    }
                }

                doneAll( err );
        });
    }

    /**
     * Projede provedene prikazy a ulozi je do databaze
     */
    var clearStockOrders = function ( orders, finalTrades, finalPrice, stock, include, cb ) {

        asyncTasks = [
            function ( done ) {
                
                clearStockOrdersBuy ( orders, finalTrades, finalPrice, stock, done );
            },
            function ( done ) {

                clearStockOrdersSell ( orders, finalTrades, finalPrice, stock, done );
            }
        ];

        async.parallel(asyncTasks, function(err){

            cb( include.stockInfo, include.res, include.orders );
            // console.log ( ".................END...................".red );
        });
    }

    var getPriceChange  = function ( from, to ) {

        return ( to - from ) * 100 / from;
    }
    
    /**
     * Zapise do databaze finalni cenu, zobchodovane mnozstvi a dalsi informace
     * pouziva se pro vedeni historie obchodu a zobrazeni do grafu
     */
    var writeOrderMatchingHistory = function ( res, stockInfo ) {

        // data pro ulozeni historie do databaze
        var dataIn = {
            finalPrice: res.finalPrice,
            finalAmount: res.finalAmount,
            priceChange: getPriceChange ( stockInfo.price, res.finalPrice ),
            ordersCount: res.ordersCount,
            ordersSatisfied: res.ordersSatisfied,
            stock_id: stockInfo._id,
            date: Date.now()
        }

        if ( ! dataIn.finalPrice ) {

            console.log ( "Final price is NULL!!!".red );
            console.dir ( dataIn );
        }

        DB.stock_history.insert ( dataIn, function ( err, res ) {

            if( err ) 
                return log.error ( "Can't write history to DB!" );

            // historie byla zapsana do DB.. 
        });

        DB.stocks.update ( { _id: stockInfo._id }, {$set: { price: res.finalPrice, priceChange: res.finalPrice  }}, function ( err, updateRes ) {

            if( err ) 
                return log.error ( "Can't update stock price in DB!" );

            // console.dir ( res );
            StockList[ stockInfo.code ].price = res.finalPrice;

            StockList[ stockInfo.code ].priceChange = dataIn.priceChange.toFixed(2);

            // v DB byla upravena cena spolecnosti
        });
    }

    /**
     * Provede order matching algoritmus pro konkretni spolecnost
     * @param  {String} stock Kod spolecnosti
     */
    var processOrderMatchingForStock = function ( stock, stockInfo, doneAll) {

        function finishTrades ( stockInfo, res, orders ) {

            var str = stockInfo.code+ " (" + stockInfo.price + " -> "+res.finalPrice +")"+
                        " BUY: " + orders.buy.length + " | SELL: " + orders.sell.length + " | DONE: "+ res.ordersSatisfied;

            // vypis info o provedenem order matchingu
            log.message ( str.green );

            // pokud probehl nejaky obchod - updatuj informace o akciich
            // ty pak odesli pripojenym brokerum
            if ( stockInfo.ordersSatisfied ) {

                brokerNoticesPriceChange[stock] = res.finalPrice;
            }

            // zapis historii
            writeOrderMatchingHistory( res, stockInfo );

            doneAll( null );
        }

        // prikazy k provedeni
        var orders = StockOrders[ stock ];

        // console.dir ( orders );
        // pokud jsou objednavky nebo poptavky
        if ( orders.sell.length && orders.buy.length ) {
            
            res = OrderBook.process ( orders, StockList[ stock ].price );
            if ( ! res )
                return;
            
            var include = {
                stockInfo: stockInfo,
                res: res,
                orders: orders
            }


            // console.dir ( orders.sell );

            clearStockOrders ( orders, res.finalTrades, res.finalPrice, stock, include, finishTrades );

        // jinak zustane puvodni cena a zpracovane mnozstvi je 0
        } else {

            var res = {
                finalPrice: stockInfo.price,
                finalAmount: 0,
                ordersCount: 0,
                ordersSatisfied: 0
            }

            finishTrades( stockInfo, res, orders );
        }
    }

    /**
     * Pro jednotlive spolecnosti provede order matching algoritmus
     * a naplanuje dalsi spusteni celeho cyklu za ORDER_MATCHING_INTERVAL ms
     */
    var processOrderMatching = function () {
        
        // zapni mereni celkove doby order matchingu
        console.time ( "OrderMatching".yellow );

        // pro vsechny spolecnosti
        async.eachSeries ( Object.keys(StockList), function ( key, done ) {

            // console.log ( key );
            // done(null);
            processOrderMatchingForStock ( key, StockList[key], done );
        },
        function ( err ) {

            // console.dir ( err );
            console.log ( ".................END................".red );
            

            sendBrokerNoticesPriceChange();
            // odesli zmenene ceny pripojenym brokerum

            // vypis dobu order matchingu pro vsechny spolecnosti
            console.timeEnd ( "OrderMatching".yellow );

            // naplanuj dalsi spusteni algoritmu
            intOrderMatching = setTimeout ( processOrderMatching, ORDER_MATCHING_INTERVAL );
        });
    }

    /**
     * Spusti order matching algoritmus v s delayem o ORDER_MATCHING_DELAY ms
     */
    var orderMatchingScheduler = function () {
        // console.dir ( "Max:
        log.message('Running order matching algorithm.'.yellow);
        
        // proved order matching
        setTimeout ( processOrderMatching, ORDER_MATCHING_DELAY );
    }
    
    /**
     * Nacte nevyrizene prikazy z minuleho behu
     */
    var loadUnfinishedOrders = function () {

        // nacte z databaze nevyrizene prikazy
        DB.orders.find ({ "$where": "this.amount > this.finished_amount" }, function ( err, res ) {

            if ( err )
                return log.message ( "Error while reading unfinished orders!".red );

            // vsechny nevyrizene prikazy pridat do seznamu ke zpracovani
            for ( i = 0; i < res.length; i++ ) {

                order = res[i];   
                addOrderItem ( order, order.code );
            }

            // pote spusti event o dokonceni inicializace
            eventEmitter.emit("stockInitialized");
        });
    }

    /**
     * Nacte vyrizene prikazy, ktere zatim nebyly akceptovany brokerem
     * ty pak v intervalu zkousi odeslat znova
     */
    var loadUncertifiedOrders = function () {

        DB.orders_finished.find( { broker_noticed: false }, function ( err, data ) {

            if ( ! data.length )
                return false;

            // vsechny prida do seznamu upozorneni urcenych k vyrizeni
            var len = data.length;
            for ( var i = 0; i < len; i++ ) {

                brokerNotices[data[i]._id] = data[i];
            }

            // console.dir ( brokerNotices );
            // nastavi odeslani notifikaci brokerum
            process.nextTick (function() {
                // sendBrokerNotice();
                setTimeout(function() {
                    sendBrokerNotice();
                }, 2000);
            });
        });
    }

    /**
     * Vrati zakladni informace o marketu
     * @return {Object} Object s daty o marketu
     */
    this.getServerInfo = function () {

        INFO.connectedBrokersCount = Object.keys(MARKET_API.getOnlineBrokers()).length;
        INFO.orderMatchingInterval = ORDER_MATCHING_INTERVAL;
        INFO.allowedPriceChange = PRICE_ALLOWED_CHANGE;
        INFO.tickSize = TICK_SIZE;

        return INFO;
    }

    function initServerInfo() {


        INFO.startTime = Date.now();
    }

    /**
     * Initace stavu burzy - nacte predchozi stav z DB
     */
    function init () {

        initServerInfo();
        // az dojde k inicializaci burzy (nacteni vsech dat), spusti se order matching 
        eventEmitter.on('stockInitialized', orderMatchingScheduler );

        // nacte se seznam spolecnosti
        loadStockList ();

        // nactou se brokerum neodeslana upozorneni
        loadUncertifiedOrders ();
    }

    // spusti se constructor burzy
    init();
    return this;
}

// singleton
MarketCore.instance = null;
module.exports = function( app, api ) {

    if ( MarketCore.instance == null )
        MarketCore.instance = new MarketCore( app, api );

    return MarketCore.instance;
}
