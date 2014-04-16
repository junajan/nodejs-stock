var path = require('path');
var expressLayouts = require('express-ejs-layouts')
var engine = require('ejs-locals');
var passport = require("passport");
var common = require("../modules/common");
var Session = require('express-session')
// var FileStore = require("connect-session-file")(Session);
var RedisStore = require('connect-redis')(Session);


var config = {
	development: {
		broker_name: "HyperBroker",
		redis: { port: 6379, host: '127.0.0.1', db: 'broker_sessions'},
		market: {"port": 5555,"addr": "127.0.0.1"},
		// market: {"port": 80,"addr": "market.asianstyle.cz"},
		dbUrl: 'mongodb://localhost/broker',
		broker_connect_interval: 1000,
        default_acc_balance: 50000,
		port: 5100,
		news_source: "http://pipes.yahoo.com/pipes/pipe.run?_id=Ti_CRJfx2xGC5Ghd1vC6Jw&_render=json",
		market_credentials: {
		    secret: "6yFQ=@781O65#]N8y4b@9dT$%4-86VzQJkx%p+J{j]lby3`(Z5[0lQ%w2R56",
	    	id: "532ae29162d715be5e000001"
		},
		// market_credentials: {
		//     secret: "alpha",
	 //    	id: "53445d3d5a4d67ce5600001e"
		// }
	},
	production: {
		broker_name: "HyperBroker",
		redis: { port: 4379, host: '127.0.0.1', db: 'broker_sessions'},
		dbUrl: 'mongodb://localhost/broker',
		market: {"port": 80,"addr": "market.asianstyle.cz"},
		// dbUrl: 'mongodb://broker:brokeradmin@localhost/broker',
		broker_connect_interval: 1000,
        default_acc_balance: 50000,
		port: 5001,
		news_source: "http://pipes.yahoo.com/pipes/pipe.run?_id=Ti_CRJfx2xGC5Ghd1vC6Jw&_render=json",
		market_credentials: {
		    secret: "6yFQ=@781O65#]N8y4b@9dT$%4-86VzQJkx%p+J{j]lby3`(Z5[0lQ%w2R56",
	    	id: "532ae29162d715be5e000001"
		}
	}
}

module.exports = function(express, app, root_path) {
    

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
	app.use(express.session({
        secret: 'have fun',
        maxAge: new Date(Date.now() + 3600000),
        store: new RedisStore( config[app.get("env")].redis ),
    }));
	// app.use(passport.initialize());
	// app.use(passport.session());
	app.use(common.createLocals );
	app.use(app.router);
	
	
	app.set("config", config[app.get('env')]);
	app.set ('stock', config[app.get("env")].market);

	// all environments
	app.set('port', process.env.PORT || config[app.get('env')].port);
	app.set('views', path.join( root_path, 'views'));
	app.set('view engine', 'ejs');
	app.set('layout', 'layout')
	app.set("startTime", Date.now() );

	// development only
	if ('development' == app.get('env')) {
	  app.use(express.errorHandler());
	}
}
