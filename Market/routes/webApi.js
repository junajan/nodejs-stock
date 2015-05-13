module.exports = function(app, router) {

    // API endpoints	
    var stock = require('../modules/WebRestApi')(app);

    var API = app.get("restApiLoc");
    // API = "";
    // // ======== GET SERVICES ==========
    router.get(API + "server-info", stock.getServerInfo);
    router.get(API + "stock-list", stock.getStockList);
    router.get(API + "workers", stock.getWorkers);
    router.get(API + "refresh-workers", stock.refreshWorkers);
    router.get(API + "stock-orders/:id", stock.getStockOrders);
    router.get(API + "stock-detail/:code", stock.getStockDetail);

    router.get(API + "broker-list", stock.getBrokerList);
    router.get(API + "broker-detail/:id", stock.getBrokerDetail);
    // app.get( API + "history", stock.getHistory );
    // app.get( API + "statistics", stock.getStatistics );

    // // ======== POST SERVICES ==========
    router.post(API + "stock-emission", stock.stockEmission);
    router.post(API + "add-stock", stock.addStock);
    router.post(API + "add-broker", stock.addBroker);

    // // must be the last one
    // app.get( API + "*", stock.stockErro404Api );
    return router;
}