var routes = require('../modules/index');

module.exports = function(app) {
	
	// var stock = require('../modules/stockRestApi')(app);
   
	app.get('/', routes.index);
	app.get('/stocks', routes.stockList);
	app.get('/stocks/:code', routes.stockDetail);
	app.get('/stock-history/:code/:type', routes.stockHistory );
	// app.post("/add-order", stock.addOrder );

	// app.get("/get-orders", stock.getOrders );


	// app.get("/rest/get-stock-list", stock.getStockList );
	// app.get("/rest/get-stock-orders", stock.getStockOrders );


	app.get('*', routes.error404 );
}
