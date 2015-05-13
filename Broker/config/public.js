var path = require('path');
var expressLayouts = require('express-ejs-layouts')
var engine = require('ejs-locals');
var passport = require("passport");
var common = require("../modules/common");
var Session = require('express-session')
var RedisStore = require('connect-redis')(Session);
var redis = require('redis');

var config = {
	development: {
		broker_name: "Easy Broker",
		redis: {
			port: 6379,
			host: '127.0.0.1',
			db: 'broker_sessions'
		},
		charts: {
			"port": 5400,
			"addr": "127.0.0.1"
		},
		market: {
			"port": 5555,
			"addr": "127.0.0.1",
			"protocol": "http"
		},
		dbUrl: 'mongodb://localhost/broker',
		broker_connect_interval: 1000,
		default_acc_balance: 50000,
		port: 5100,
		livereload: true,
		news_source: "http://pipes.yahoo.com/pipes/pipe.run?_id=Ti_CRJfx2xGC5Ghd1vC6Jw&_render=json",
		market_credentials: {
			name: "Broker01",
			secret: "broker_password"
		},
	},
	production: {
		broker_name: "OpenBroker",
		redis: {
			port: 6379,
			host: '127.0.0.1',
			db: 'broker_sessions'
		},
		charts: {
			"port": 5400,
			"addr": "biblio.stare.cz"
		},
		market: {
			"port": 5555,
			"addr": "biblio.stare.cz",
			"protocol": "http"
		},
		dbUrl: 'mongodb://localhost/broker',
		broker_connect_interval: 1000,
		default_acc_balance: 50000,
		port: 5100,
		livereload: false,
		news_source: "http://pipes.yahoo.com/pipes/pipe.run?_id=Ti_CRJfx2xGC5Ghd1vC6Jw&_render=json",
		market_credentials: {
			name: "Broker01",
			secret: "broker_password"
		},
	},
};

module.exports = function(express, app, root_path) {

	if (!~(Object.keys(config).indexOf(app.get('env')))) {
		console.log("Bad environment! Must be one of:", Object.keys(config));
		process.exit(1);
	}

	app.set("config", config[app.get('env')]);
	app.set('stock', config[app.get("env")].market);

	app.engine('ejs', engine);

	app.use(express.static(path.join(root_path, 'public')));

	app.use(express.methodOverride());
	app.use(expressLayouts);
	app.use(express.favicon());
	app.use(express.json());
	app.use(express.urlencoded());

	var client = redis.createClient(app.get("config").redis.port, app.get("config").redis.host);

	client.on("error", function(err) {
		console.log(("Redis error encountered" + JSON.stringify(String(err))).red);
		process.exit(1);
	});

	app.use(express.cookieParser());
	app.use(express.bodyParser());
	app.use(express.session({
		secret: 'have fun',
		maxAge: new Date(Date.now() + 3600000),
		store: new RedisStore(app.get("config").redis)
	}));
	app.use(common.createLocals);
	app.use(app.router);


	// all environments
	app.set('port', process.env.PORT || config[app.get('env')].port);
	app.set('views', path.join(root_path, 'views'));
	app.set('view engine', 'ejs');
	app.set('layout', 'layout')
	app.set("startTime", Date.now());

	// development only
	if ('development' == app.get('env')) {
		app.use(express.errorHandler());
	}
};