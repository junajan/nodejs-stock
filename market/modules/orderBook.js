var colors = require("colors");
var log = require("../modules/log")(true, true);
var _ = require("underscore");

var TICK_SIZE  = 0.01;

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


var OrderBook = function OrderBook( app ) {
    
    var OrderBook = this;
    var tickSizeCount = getTickSizeCount ( TICK_SIZE );

    /**
     * Zaokrouhli cislo na dane tick size (granularitu)
     */
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

        return price.toFixed( tickSizeCount );
    }

    function getDefaultHashItem () {

        return {
            price: 0,
            buy: {
                amount: 0,
                sumAmount: 0,
                price: 0,
                orderCount: 0,
                values: []
            },
            sell: {
                amount: 0,
                sumAmount: 0,
                price: 0,
                orderCount: 0,
                values: []
            }
        }
    }

    function createHashTable ( orders, countAll ) {

        var ordersLines = [];

        var indSell = 0;
        var indBuy = 0;
        var indHash = -1;
        var item, type;

        var sumBuy = 0;
        var sumSell = 0;

        // projde vsechny prikazy ze seznamu buy i sell
        // a zpracuje je do pole prikazu
        for ( var i = 0; i < countAll; i++ ) {

            if ( ! ( indBuy in orders.buy ) || (( indSell in orders.sell ) && orders.buy[indBuy].price > orders.sell[indSell].price ) ) {

                item  = {
                    price: orders.sell[indSell].price,
                    amount: orders.sell[indSell].amount - orders.sell[indSell].finished_amount
                    } 
                type = 0;
                indSell++;
            } else {
                
                // item =  orders.buy[indBuy];
                item  = {
                    price: orders.buy[indBuy].price,
                    amount: orders.buy[indBuy].amount - orders.buy[indBuy].finished_amount  
                    };
                type = 1;
                indBuy++;
            }

            if ( ! ordersLines.length || ordersLines[indHash].price != item.price ) {

                ordersLines.push ( getDefaultHashItem() );
                indHash++;
            }

            item.price = parseFloat( item.price ).toFixed(2);
            item.amount = parseInt( item.amount );
            
            ordersLines[indHash].price = item.price;
            
            if ( type ) {
                // pridavame do buy
                sumBuy += item.amount;
                
                ordersLines[indHash].buy.price = item.price;
                ordersLines[indHash].buy.amount += item.amount;
                // ordersLines[indHash].buy.sumAmount = sumBuy;
                // ordersLines[indHash].buy.values.push( item );
                ordersLines[indHash].buy.orderCount++;
                
            } else {
                // pridavame do sell
                sumSell += item.amount;
                
                ordersLines[indHash].sell.price = item.price;
                ordersLines[indHash].sell.amount += item.amount;
                ordersLines[indHash].sell.sumAmount = sumSell;
                // ordersLines[indHash].sell.values.push( item );
                ordersLines[indHash].sell.orderCount++;
            }
        }

        prevSell = 0;
        var end = ordersLines.length;
        for ( var i = 0; i < end ; i++ ) {
            
            ordersLines[i].buy.sumAmount = sumBuy;
            sumBuy -= ordersLines[i].buy.amount;

            if ( ! ordersLines[i].sell.sumAmount )
                ordersLines[i].sell.sumAmount = prevSell;

            prevSell = ordersLines[i].sell.sumAmount;
            // console.dir ( ordersLines[i].sell.values );
        }

        return ordersLines;
    }

    /**
     * Provede nad zadanou mnozinou prikazu order matching algoritmus
     * a vrati finalni provedene obchody
     */
    var getBestOrdersLines = function ( orderLines ) {

        var bestLines = [];
        var ordersList = [];
        var bestLinesQty = bestLinesPriceQty = 0;

        var len = orderLines.length;
        for ( var i = 0; i < len; i++ ) {
            line = orderLines[i];

            item = {
                price: line.price,
                buyQty: line.buy.sumAmount,
                sellQty: line.sell.sumAmount,
            }

            item.maxQty = Math.min( item.buyQty, item.sellQty );
            item.imbalance = Math.max( item.buyQty, item.sellQty ) - item.maxQty;
            item.maxPriceQty = item.maxQty * item.price;

            ordersList.push ( item );


            // ================ verze pro rozhodovani pouze podle poctu * cena
            if ( item.maxPriceQty > bestLinesPriceQty ) {

                bestLines = [];
                bestLinesPriceQty = item.maxPriceQty;
            }

            if (  item.maxPriceQty && item.maxPriceQty == bestLinesPriceQty )
                bestLines.push ( item )

            
            // // ================ verze pro rozhodovani pouze podle poctu
            // if ( item.maxQty > bestLinesQty ) {

            //     bestLines = [];
            //     bestLinesQty = item.maxQty;
            // }

            // if (  item.maxQty && item.maxQty == bestLinesQty )
            //     bestLines.push ( item )
        }

        return { best: bestLines, list: ordersList }
    }

    /**
     * Vyhodnoti uskutecnitelne obchody a vrati nejlepsi variantu
     */
    var getBestPriceQty = function ( maxLines, referencePrice ) {

        minImbalanceIndexes = {};
        var endPrice = 0;
        var finalQty = 0;

        maxLinesLength = Object.keys(maxLines).length;
        if ( maxLinesLength == 0 ) {

            // v tabulce neni zadny maximalni mnozstvi -> neprobehne obchod
            endPrice = referencePrice;

        } else if ( maxLinesLength == 1 ) {

            // v tabulce je pouze jeden radek s max mnozstvim -> probehne obchod
            // za cenu uvedenou v teto radce
            
            endPrice = maxLines[0].price;
            finalQty = maxLines[0].maxQty;

        } else {

            // v tabulce je vice radku s max mnozstvim -> pouzije se dalsi kriterium vyberu
            
            minImbalance = Number.MAX_VALUE;
            minImbalanceIndexes = [];
            minImbalanceSuccess = true;
            for (var key in maxLines) {

                if ( maxLines[key].imbalance < minImbalance ) {
                    minImbalanceIndexes = [];
                    minImbalance = maxLines[key].imbalance;
                }

                if ( maxLines[key].imbalance == minImbalance ) {

                    minImbalanceIndexes.push( key );
                }
            }

            if ( minImbalanceIndexes.length == 1 ) {
                // byla vybrana pouze jedna radka s minimalni imbalanci
                // cena bude podle teto radky

                endPrice = maxLines[minImbalanceIndexes[0]].price;
                finalQty = maxLines[minImbalanceIndexes[0]].maxQty;

            } else {
                // vic radku ma stejne max mnozstvi a minimalni imbalanci
                // pouzije se dalsi kriterium

                // projde radky s nejvetsi imbalanci a porovna velikosti nabidek a poptavek
                var directionChangeCount = 0;
                var direction = -1;
                var key;
                for (var ind in minImbalanceIndexes) {
                    key = minImbalanceIndexes[ind];

                    if ( maxLines[key].buyQty < maxLines[key].sellQty && direction != 0 ) {

                        directionChangeCount++;
                        direction = 0;

                    } else if ( maxLines[key].buyQty > maxLines[key].sellQty && direction != 1 ) {

                        directionChangeCount++;
                        direction = 1;
                    }
                }

                if ( directionChangeCount == 1 ) {
                    

                    // je vetsi nabidka jak poptavka nebo naopak -> zvol cenu podle toho
                    if ( direction == 0 ) {
                        // je vetsi poptavka (vice buy nez sell)
                        // => vem vetsi cenu
                        
                        endPrice = maxLines[minImbalanceIndexes[0]].price;
                        finalQty = maxLines[minImbalanceIndexes[0]].maxQty;
                    } else {
                        // je vetsi dodavka (vice sell nez buy)
                        // => vem mensi cenu

                        endPrice = maxLines[minImbalanceIndexes[ minImbalanceIndexes.length - 1 ]].price;
                        finalQty = maxLines[minImbalanceIndexes[ minImbalanceIndexes.length - 1 ]].maxQty;
                    }

                } else {
                    // pokud souhlasi max velikosti obchodu i imbalance a nesouhlasi smer poptavky a nabidky
                    // u jednotlivych radku, pak ceny zprumeruj

                    qty1 = maxLines[minImbalanceIndexes[0]].maxQty;
                    qty2 = maxLines[minImbalanceIndexes[ minImbalanceIndexes.length - 1 ]].maxQty;

                    finalQty = Math.min( qty1, qty2 );

                    max = parseFloat(maxLines[minImbalanceIndexes[0]].price);
                    min = parseFloat(maxLines[minImbalanceIndexes[ minImbalanceIndexes.length - 1 ]].price);

                    endPrice = getRoundedPrice ( TICK_SIZE, tickSizeCount, referencePrice, (max + min) / 2 );
                }
            }
        }

        return {
            price: endPrice,
            qty: finalQty
        };
    }

    /**
     * Vrati provedene obchody
     * @param  {[type]} ordersLines [description]
     * @param  {[type]} maxQty      [description]
     * @return {[type]}             [description]
     */
    var getFinalTrades = function ( orders, maxQty, price ) {

        // console.dir ( orders );
        // console.dir ( "Max: " + maxQty + " - bestPrice: " + price );

        var finalTrades = [];

        var indBuy = 0;
        var indSell = 0;
        var count = 0;
        var amountSell, amountBuy;

        // zjistime si index, tj. pozici, kde v tabulce
        // je nase cena a od te pojedeme a budeme parovat prikazy
        for ( indBuy in orders.buy ) {
            if ( orders.buy[indBuy].price > price ) {

                // console.dir ( indBuy );
                if ( parseInt(indBuy) )
                    indBuy--;
                break;
            }
        }
        
        for ( var indSell in orders.sell ) {
            if ( orders.sell[indSell].price > price ) {

                indSell--;   
                break;
            }
        }

        // if ( indBuy < 0 )

        // snizime indexy o 1 (dostaneme indexy prikazu, ktere uz zacneme parovat)
        // indBuy--;
        // indSell--;

        // console.log ( (indBuy +" - " + indSell).red );

        // dokud nenaplnime max pocet, tak parujeme polozkyn
        while ( maxQty > 0 ) {

            // console.log ( ( "====> "+ indBuy +" vs " + indSell + " - " + maxQty ).red );


            if ( indSell < 0 || indBuy > orders.buy.length - 1 ) {

                console.log ( "====== CHYBA: BUY NEBO SELL mimo meze".red );
                break;
            }


            amountBuy = orders.buy[indBuy].amount - orders.buy[indBuy].finished_amount;
            amountSell = orders.sell[indSell].amount - orders.sell[indSell].finished_amount;

            // sestavime zaznam, jaky kupec dostane od jakeho prodejce kolik jednotek
            finalItem = {
                price: price,
                qty: Math.min ( amountBuy, amountSell, maxQty ),
                buyId: orders.buy[indBuy]._id,
                buy_broker_id: orders.buy[indBuy].broker_id,
                sellId: orders.sell[indSell]._id,
                sell_broker_id: orders.sell[indSell].broker_id
            };

            if ( finalItem.qty < 0 ) {

                console.log ( "========== CHYBA FINAL_ITEM_QTY ".red );
                if ( amountBuy < 0 )
                    indBuy++;
                else
                    indSell--;

                continue;
            } 


            // vlozime zaznam do seznamu
            finalTrades.push ( finalItem );

            // console.log ( ( finalItem.qty + "" ) .yellow );
            // snizime maxQty
            maxQty -= finalItem.qty;
            
            sellQty = amountSell;
            buyQty = amountBuy;

            if ( buyQty < sellQty ) {
                
                indBuy++;
                count ++;
                
            } else if ( buyQty > sellQty ) {
                
                indSell--;
                count ++;
                
            } else {
                    
                count += 2;

                indBuy++;
                indSell--;
            }

        }

        // console.dir ( finalTrades );

        return {
            trades: finalTrades,
            count: count
        };
    }

    var printOrdersList = function ( list ) {

        for ( i in list ) {
            it = list[i];

            console.log ( it.price+": "+ it.buyQty+" vs " + it.sellQty + " | max: (" + it.maxPriceQty + ") " + it.maxQty + " | imb: " + it.imbalance );
        }
    }

    /**
     * Provede order matching algoritmus nad zadanou mnozinou prikazu
     * vraci seznam provedenych tradu, mnozstvi, jejich ID a ID brokera
     */
    this.process = function ( orders, referencePrice ) {

        // console.dir ( orders );

        var ordersNew = JSON.parse ( JSON.stringify ( orders ) );
        var countAll = ordersNew.buy.length + ordersNew.sell.length;

        // udela vzestupnou a sestupnou sumu objednavek
        var orderLines = createHashTable ( ordersNew, countAll );

        // console.dir ( orderLines );

        // vezme si jen sumy a spocita zobchodovatelne mnozstvi a imbalanci
        var lines = getBestOrdersLines ( orderLines );

        // printOrdersList ( lines.list );

        // podle porovnavani vrati nejlepsi cenu a mnozstvi jednotek,
        // ktere se za tuto cenu daji zobchodovat
        var res = getBestPriceQty ( lines.best, referencePrice );

        // console.dir ( res );

        // podle ceny a mnozstvi vybere a sparuje nabidku a poptavku
        var finalTrades = getFinalTrades ( ordersNew, res.qty, res.price );

        // console.dir ( finalTrades );

        return {
            finalTrades: finalTrades.trades,
            finalPrice: res.price,
            finalAmount: res.qty,
            ordersCount: countAll,
            ordersSatisfied: finalTrades.count
        };
    }
    
    return this;
}

OrderBook.instance = null;
module.exports = function() {

    if ( OrderBook.instance == null )
        OrderBook.instance = new OrderBook();

    return OrderBook.instance;
}
