var path = require('path');
var expressLayouts = require('express-ejs-layouts')
var engine = require('ejs-locals');
var passport = require("passport");
var common = require("../modules/common");
var Session = require('express-session')

var config = {
	development: {
		robot_name: "Robot Broker 01",
		// market: {"port": 5555,"addr": "127.0.0.1"},
		market: {"port": 80,"addr": "market.asianstyle.cz"},
		dbUrl: 'mongodb://localhost/broker_robot01',
		broker_connect_interval: 1000,
		port: 5002,
		market_credentials: {
		    secret: "robotbroker",
	    	id: "534be8db00afeedf3c005207"
		},
		// market_credentials: {
		//     secret: "alpha",
	 //    	id: "53445d3d5a4d67ce5600001e"
		// }
	},
	production: {
		robot_name: "Robot Broker 01",
		dbUrl: 'mongodb://localhost/broker_robot01',
		market: {"port": 80,"addr": "market.asianstyle.cz"},
		// dbUrl: 'mongodb://broker:brokeradmin@localhost/broker_robot01',
		broker_connect_interval: 1000,
		port: 5002,
		market_credentials: {
		    secret: "broker_robot01",
	    	id: ""
		}
	}
}

module.exports = function(express, app, root_path) {
	
	app.set("config", config[app.get('env')]);
	app.set ('stock', config[app.get("env")].market);
    
    
	app.engine('ejs', engine);
	
	app.use(express.static(path.join(root_path, 'public')));
	
	// app.use(express.logger('dev'));
	app.use(express.methodOverride()); 		
	app.use(expressLayouts);
	app.use(express.favicon());
	app.use(express.json());
	app.use(express.urlencoded());
	app.use(express.logger('dev'));

	app.use(express.cookieParser());
	app.use(express.bodyParser());
	// app.use(passport.initialize());
	// app.use(passport.session());
	app.use(common.createLocals(app) );
	app.use(app.router);
	

	// all environments
	app.set('port', process.env.PORT || config[app.get('env')].port);
	app.set('views', path.join( root_path, 'views'));
	app.set('view engine', 'ejs');
	app.set('layout', 'layout')
	
	// development only
	if ('development' == app.get('env')) {
	  app.use(express.errorHandler());
	}
}
