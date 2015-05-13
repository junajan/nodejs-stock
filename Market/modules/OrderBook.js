var colors = require("colors");
var Log = require("../modules/Log")("OrderBook", true, true);
var async = require('async');

/**
 * Spocita desitkovy nasobek, kterym musime vynasobit tick size
 * aby z nej vyslo cele cislo
 */
var OrderBook = function(app, MARKET_API) {
    
    var self = this;
    var DB = app.get("DB");
    var Order = require("../dao/order")(app);
    var Notification = require("../dao/notification")(app);
    var Messenger = require("./Messenger")(app, self, MARKET_API);
    var EMITTENT_BROKER = 1;

    self.T_BUY   = 1;
    self.T_SELL  = 2;

    // ===================================
    // ===== Received orders =============
    // ===================================

    /**
     * Funkce prida order kdykoliv do DB
     */
    this.addOrder = function(data, done) {
        Order.add(data, done);
    };

    /**
     * Funkce ukonci zpracovani tradu
     */
    this.finishOrder = function(id, done) {
        return Order.finish(id, done);
    };

    /**
     * Funkce ukonci zpracovani tradu
     */
    this.finishTrade= function(buyOrderId, sellOrderId, side, done) {
        if(side == self.T_BUY)
            return Order.finishTradeBuyer(buyOrderId, sellOrderId, done);
        else
            return Order.finishTradeSeller(buyOrderId, sellOrderId, done);
    };

    /**
     * Funcke zpracuje notifikaci jednoho prijateho orderu
     *  - zkus poslat brokerovi info o prijeti
     *  - pokud ho prijme, oznaci ho za prijaty v DB
     *  - pokud ne, necha ho byt (vyridi se jindy)
     */
    this.processUnnotifiedAddOrder = function(done, order) {
        async.waterfall([
            function(done) {
                Broker.sendAddOrderNotification(order, done);
            },
            function(done, res) {
                // pokud broker odpovedel spravne, nastav priznak na notified
                if(res.ok)
                    return Notification.setOrderReceivingNotified(order.id, done);

                order.type =  Messenger.T_ORDER_ADD_NOTIFIED;
                // pokud broker odpovedel s chybou nebo timeoutem
                // pridej zpravu do fronty
                return Messenger.add(order, done);
            }
        ], done);
    };

    /**
     * Funkce zpracuje prijate nenotifikovane ordery
     *  - Nacte si je z DB
     *  - paralelne 
     */
    this.processUnnotifiedAddOrders = function(done) {
        Notification.getUnnotifiedReceivedOrders(function(err, orders) {
            if(err)
                throw err;

            async.parallel(orders, self.processUnnotifiedAddOrder, done);
        });
    };

    /**
     * Funkce vezme zpracovany obchod a odesle obema stranam (seller, buyer)
     * vysledek obchodu
     */
    this.notifyProcessedTrade = function(trade, info, done) {

        // send notify to buyer
        Messenger.send({
            orderId: trade.buyOrderId,
            stockId: info.stockId,
            brokerId: trade.buyerId,
            type: Messenger.T_PROCESSED,
            amount: trade.amount,
            price: info.price,
            side: self.T_BUY,
            buyOrderId: trade.buyOrderId,
            sellOrderId: trade.sellOrderId

        });
        
        if(trade.seller_id == EMITTENT_BROKER) {
            // console.log("Potvrzuji emitenta");
            // self.finishTrade(msg.tradeId,  self.T_SELL, function() {});
        } else {

            // send notify to seller
            Messenger.send({
                orderId: trade.sellOrderId,
                stockId: info.stockId,
                brokerId: trade.sellerId,
                type: Messenger.T_PROCESSED,
                amount: trade.amount,
                price: info.price,
                side: self.T_SELL,
                buyOrderId: trade.buyOrderId,
                sellOrderId: trade.sellOrderId
            });
        }

        done(null, trade);
    };
    
     /**
     * Funkce vezme zpracovany obchod z DB a odesle obema stranam (seller, buyer)
     * vysledek obchodu
     */
    this.notifyProcessedTradeDb = function(trade, done) {

        if(!trade.buyer_notified) {

            // send notify to buyer
            Messenger.send({
                orderId: trade.buy_order_id,
                stockId: trade.stock_id,
                brokerId: trade.buyer_id,
                type: Messenger.T_PROCESSED,
                amount: trade.amount,
                price: trade.price,
                side: self.T_BUY,
                tradeId: trade.id,
                buyOrderId: trade.buy_order_id,
                sellOrderId: trade.sell_order_id
            });
        }

        if(!trade.seller_notified) {
            if(trade.seller_id == EMITTENT_BROKER) {
                self.finishTrade(trade.buy_order_id, trade.sell_order_id, self.T_SELL, function() {});
            } else {

                // send notify to seller
                Messenger.send({
                    orderId: trade.sell_order_id,
                    stockId: trade.stock_id,
                    brokerId: trade.seller_id,
                    type: Messenger.T_PROCESSED,
                    amount: trade.amount,
                    price: trade.price,
                    side: self.T_SELL,
                    tradeId: trade.id,
                    buyOrderId: trade.buy_order_id,
                    sellOrderId: trade.sell_order_id
                });
            }
        }
        done(null, trade);
    };

    // ===================================
    // ===== Process trades ==============
    // ===================================

    this.setTradeNotified = function(id, cb) {
        Notification.setTradeNotified(cb);
    };

    /**
     * Funkce vezme jeden probehly trade
     * - zkusi poslat notifikaci brokerovi
     *   - pokud ji prijme, oznaci notifikaci za vyrizenou
     *   - pokud ne, necha ji byt (posleme ji jindy)
     */
    this.processUnnotifiedTrade = function(done) {

        async.waterfall([
            function(done) {
                Broker.sendTradeNotification(order, done);
            },
            function(done, res) {
                if(res)
                    return Notification.setTradeNotified(done);
                return done(null, false);
            }
        ], done);
    };

    /**
     * Nacte probehle trady, o kterych broker nebyl notifikovan
     *  - paralelne zkusi kazdy poslat brokerovy
     *   - pokud ho prijme, tak ho oznaci za prijaty
     *   - pokud ho neprijme, tak nic (posleme ho jindy)
     */
    this.processUnnotifiedTrades = function(done) {
        Notification.getUnnotifiedTrades(function(err, trades) {
            if(err)
                throw err;

            async.parallel(trades, self.processUnnotifiedTrade, done);
        });
    };

    // ===================================
    // ===== Cancelled orders ============
    // ===================================

    /**
     * Funkce zpracuje nenotifikovane zrusene prikazy
     * @param  {Function} cb [description]
     * @return {[type]}      [description]
     */
    this.processUnnotifiedCanceledOrders = function(done) {
        Notification.getUnnotifiedCanceledOrders(function(err, orders) {
            if(err)
                throw err;

            async.parallel(orders, self.processUnnotifiedCanceledOrder, done);
        });
    };

    this.sendMessengerCancelOrder = function(order, done) {
        Messenger.send({
            orderId: order.id,
            stockId: order.stock_id,
            brokerId: order.broker_id,
            type: Messenger.T_CANCEL,
            amount: order.amount,
            price: order.price
        });
        done(null, order);
    };

    this.processCancelOrder = function(order, done) {

        Order.cancel(order.id, function(err, res) {
            if(err || !res || !res.length || ! res[0].cancelled)
                return done(err, res);

            order.amount = res[0].cancelled;
            self.sendMessengerCancelOrder(order, done);
        });
    };

    /**
     * Vyrizuje cancel ordery kazdy tick pred samotnym ordermatchingem
     * - funkce zavola stored proceduru na zpracovani cancel orderu v DB
     * - pak si nacte nenotifikovane cancel ordery (tj. i ty vyrizene)
     * - a paralelne je zkusi poslat brokerum
     *   - pokud je broker prijme, oznaci je za notifikovane
     *   - pokud ne, nechaji je byt - odeslou se jindy
     * 
     */
    this.processCancelOrders = function(done) {
        Order.getOrdersMarkedToCancel(function(err, res) {
            if(err) return done(err, res);
            async.each(res, self.processCancelOrder, done);
        });
    };

    // ===================================
    // ===== Expired orders ==============
    // ===================================


    this.sendMessengerExpireOrder = function(order, done) {

        Messenger.send({
            orderId: order.id,
            stockId: order.stock_id,
            brokerId: order.broker_id,
            type: Messenger.T_EXPIRE,
            amount: order.amount,
            price: order.price
        });

        done(null, order);
    };


    /**
     * Funcke vezme jeden expirovany order
     * - oznaci ho za expirovany
     */
    this.processExpiredOrder = function(order, done) {

        // pokud order je emisni - od emitujiciho brokera, neexpiruj ho
        if(order.broker_id === EMITTENT_BROKER)
            return done(null);

        Order.expire(order.id, function(err, res) {
            if(err || !res || !res.length || ! res[0].expired)
                return done(err, res);

            order.amount = res[0].expired;
            self.sendMessengerExpireOrder(order, done);
        });
    };

    /**
     * Funkce zpracuje expirovane objednavky
     * - nacte objednavky z DB
     * - paralelne je oznacuje za expirovane
     * - a zkusi na to upozornit brokera
     *     - a pokud ok oznaci expired notifikaci za vyrizenou
     *     - jinak skonci (a broker dostane notifikaci jindy)
     */
    this.processExpiredOrders = function(done) {
        Order.getExpiredOrders(app.get("config").core.expiryTTL, function(err, orders) {
            if(err)
                return done(err, null);

            // paralelne zpracuje ordery
            async.each(orders, self.processExpiredOrder, done);
        });
    };


    // ===================================
    // ===== Init operations =============
    // ===================================

    /**
     * Funkce nacte z DB prikazy, ktere byly zrusene, ale nebyly
     * odeslane brokerovi / nebyly jim potvrzene a odesle je
     */
    this.resendUnnotifiedCancelResults = function() {
        Notification.getUnnotifiedCanceledOrders(function(err, res) {
            if(err)
                throw err;
            async.map(res, self.sendMessengerCancelOrder, function(err, res) {
                if(err)
                    return Log.error("Unnotified cancelled orders init returned error: ", err);
                Log.event("Inituji seznam nenotifikovanych zrusenych prikazu");
            });

        });
    };

    /**
     * Funkce nacte z DB prikazy, ktere byly expirovane, ale nebyly
     * odeslane brokerovi / nebyly jim potvrzene a odesle je
     */
    this.resendUnnotifiedExpireResults = function() {

        Notification.getUnnotifiedExpiredOrders(function(err, res) {
            if(err)
                throw err;
           
           async.map(res, self.sendMessengerExpireOrder, function(err, res) {
                if(err)
                    return Log.error("Unnotified expired orders init returned error: ", err);
                Log.event("Inituji seznam nenotifikovanych expirovanych prikazu");
            });
        });
    };

    /**
     * Funkce nacte z DB prikazy, ktere byly uspesne provedene, ale nebyly
     * odeslane brokerovi / nebyly jim potvrzene a odesle je
     */
    this.resendUnnotifiedProcessedResults = function() {
        Notification.getUnnotifiedTrades(function(err, res) {
            if(err)
                throw err;

            async.map(res, self.notifyProcessedTradeDb, function(err, res) {
                if(err)
                    return Log.error("Unnotified processed orders init returned error: ", err);
                Log.event("Inituji seznam nenotifikovanych provedenych obchodu");
            });

        });
    };

    /**
     * Funkce nainituje obchodni knihu
     *  - nacte neodeslane notifikace pro expire, cancel
     */
    this.init = function() {

        self.resendUnnotifiedCancelResults();
        self.resendUnnotifiedExpireResults();
        self.resendUnnotifiedProcessedResults();
    };

    this.init();

    return this;
};

// zdedime event emitter
// -> pokud bysme chteli emitovat nejake eventy
// util.inherits(OrderBook, EventEmitter);

// singleton
OrderBook.instance = null;
module.exports = function(app, MARKET_API) {

    if (OrderBook.instance == null)
        OrderBook.instance = new OrderBook(app, MARKET_API);

    return OrderBook.instance;
};
