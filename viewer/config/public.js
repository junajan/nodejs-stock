
var path = require('path');
var expressLayouts = require('express-ejs-layouts')
var engine = require('ejs-locals');

module.exports = function(express, app, root_path) {
    
	app.engine('ejs', engine);
	
	app.use(express.static(path.join(root_path, 'public')));
	app.use(express.bodyParser()); 							// pull information from html in POST
	app.use(express.methodOverride()); 		
   

	// all environments
	app.set('port', process.env.PORT || 4444);
	app.set('views', path.join( root_path, 'views'));
	app.set('view engine', 'ejs');
	app.set('layout', 'layout')
	

	app.use(expressLayouts);
	app.use(express.favicon());
	app.use(express.logger('dev'));
	app.use(express.json());
	app.use(express.urlencoded());
	app.use(express.methodOverride());
	app.use(app.router);

	var dbConfig = {
		collections	: [
						"orders", "orders_finished",
						"brokers", "broker_connections", "broker_stocks",
						"stocks", "stock_history"
						],
		dbUrl 		: "market"		
	}

	app.set ( "dbConfig", dbConfig );
	
	// development only
	if ('development' == app.get('env')) {
	  app.use(express.errorHandler());
	}

}
