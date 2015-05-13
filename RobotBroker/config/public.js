var path = require('path');
var expressLayouts = require('express-ejs-layouts');
var engine = require('ejs-locals');
var common = require("../modules/common");
var expressJson = require("express-json")();

var config = {
	robot1: {
		robot_name: "Robot Broker 01",
		market: {"port": 5555,"addr": "127.0.0.1"},
		dbUrl: 'mongodb://localhost/broker_robot01',
		broker_connect_interval: 1000,
		port: 5200,
		market_credentials: {
			secret: "robot01_password",
			name: "Robot01"
		},
	},
	robot2: {
		robot_name: "Robot Broker 02",
		market: {"port": 5555,"addr": "127.0.0.1"},
		dbUrl: 'mongodb://localhost/broker_robot02',
		broker_connect_interval: 1000,
		port: 5201,
		market_credentials: {
			secret: "robot02_password",
			name: "Robot02"
		}
	},
	production: {
		robot_name: "Robot Broker 01",
		dbUrl: 'mongodb://localhost/broker_robot01',
		market: {"port": 5555,"addr": "biblio.stare.cz"},
		// dbUrl: 'mongodb://broker:brokeradmin@localhost/broker_robot01',
		broker_connect_interval: 1000,
		port: 5200,
		market_credentials: {
			secret: "robot01_password",
			name: "Robot01"
		}
	},
	production2: {
		robot_name: "Robot Broker 02",
		dbUrl: 'mongodb://localhost/broker_robot02',
		market: {"port": 5555,"addr": "biblio.stare.cz"},
		// dbUrl: 'mongodb://broker:brokeradmin@localhost/broker_robot01',
		broker_connect_interval: 1000,
		port: 5201,
		market_credentials: {
			secret: "robot02_password",
			name: "Robot02"
		}
	}
};

module.exports = function(express, app, root_path) {
	if(app.get('env') == "development")
		app.set('env', "robot1");
	
	if (!~(Object.keys(config).indexOf(app.get('env')))) {
		console.log("Bad environment! Must be one of:", Object.keys(config));
		process.exit(1);
	}
	
	app.set("startTime", Date.now() );
	var robotConf = config[app.get('env')];

	// pokud je nastavena promenna NODE_ROBOT_PORT, upravi se config
	if("NODE_ROBOT_PORT" in process.env) {

		robotConf.port = process.env["NODE_ROBOT_PORT"];

		robotConf.robot_name = "Robot Broker "+robotConf.port;
		robotConf.market_credentials = {
			secret: "robot_password_"+robotConf.port,
			name: "Robot_"+robotConf.port
		};

		robotConf.dbUrl = 'mongodb://localhost/broker_robot_'+robotConf.port;
		console.log("Spoustim robota s konfiguraci: ", robotConf);
	}

    robotConf.ui = {
		interval: 1000,		// zpracovani robota probiha v intervalu X milisekund
		delay: 5000,		// robot zacina praci X milisekund po startu
		stocks: ["AAPL", "GOOG", "FB", "IMCO", "LLY"],	// robot sleduje tyto zadane spolecnosti
		sell_limit: 500,		// robot ma v jednu chvili podanou poptavku na max X akcii
		buy_limit: 500,		// robot ma v jednu chvili podanou poptavku na max X akcii
		price_range: 5,		// zadavana cena se lisi max o X% od aktualni referencni ceny
    };

	app.set("config", robotConf);
	app.set('stock', config[app.get("env")].market);

	app.engine('ejs', engine);
	app.use(express.static(path.join(root_path, 'public')));
	app.use(expressLayouts);
	app.use(expressJson);
	app.use(common.createLocals(app) );

	// all environments
	app.set('port', process.env.PORT || config[app.get('env')].port);
	app.set('views', path.join( root_path, 'views'));
	app.set('view engine', 'ejs');
	app.set('layout', 'layout');
};
