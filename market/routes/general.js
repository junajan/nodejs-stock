
module.exports = function(app) {
		
	// umisteni RESTove sluzby
	var restLoc =  "/rest/";

	// obsluhujici trida
	var stock = require('../modules/stockRestApi')(app);
   
	// app.get('/', stock.index);

	app.get( restLoc + "server-info", stock.getServerInfo );
	app.get( restLoc + "stock-list", stock.getStockList );
	app.get( restLoc + "stock-orders/:code", stock.getStockOrders );
	app.get( restLoc + "stock-detail/:code", stock.getStockDetail );
	app.get( restLoc + "broker-list", stock.getBrokerList );
	app.get( restLoc + "broker-detail/:id", stock.getBrokerDetail );

	app.post( restLoc + "stock-emission", stock.stockEmission );
	app.post( restLoc + "add-stock", stock.addStock );
	app.post( restLoc + "add-broker", stock.addBroker );

	app.get('*', stock.index );
}
