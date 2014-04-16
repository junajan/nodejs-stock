var path = require('path');
var expressLayouts = require('express-ejs-layouts')
var engine = require('ejs-locals');


var config = {
	development: {
		db_url: "market",
		emission_broker: {id: 0,_id: "532f09a09988ccb556110e0a"},
		order_matching_interval: 4000,
		price_alowed_change: 30,
		tick_size: 0.01,
		port: 5555,
	},
	production: {
		db_url: "market",
		// db_url: "market:marketadmin@localhost/market",
		emission_broker: {id: 0,_id: "532f09a09988ccb556110e0a"},
		order_matching_interval: 4000,
		price_alowed_change: 30,
		tick_size: 0.01,
		port: 5555,
	}
}

module.exports = function(express, app, root_path) {
    
	app.engine('ejs', engine);
	
	app.use(express.static(path.join(root_path, 'public')));
	app.use(express.bodyParser()); 
	app.use(express.methodOverride());
   
	// all environments
	app.set('port', process.env.PORT || config[app.get('env')].port );
	app.set('views', path.join( root_path, 'views'));
	app.set('view engine', 'ejs');
	app.set('layout', 'layout')

	app.use(expressLayouts);
	app.use(express.favicon());
	// app.use(express.logger('dev'));
	app.use(express.json());
	app.use(express.urlencoded());
	app.use(express.methodOverride());
	app.use(app.router);

	app.set("config", config[app.get('env')]);


	var dbConfig = {
		collections	: [
				"orders", "orders_finished",
				"brokers", "broker_connections", "broker_stocks",
				"stocks", "stock_history"
				],
		dbUrl 		: config[app.get('env')].db_url
	}

	app.set ( "dbConfig", dbConfig );
	
	// development only
	if ('development' == app.get('env')) {
	  app.use(express.errorHandler());
	}

}
