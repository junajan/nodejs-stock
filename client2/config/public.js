var flash = require('connect-flash');
var path = require('path');
var expressLayouts = require('express-ejs-layouts')
var engine = require('ejs-locals');
var colors = require("colors");
var passport = require("passport");
var common = require("../modules/common");
// var FileStore = require("connect-session-file")(Session);

var connect = require("connect");
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var methodOverride = require('express-method-override');
var expressJson = require('express-json');
var expressLogger = require('express-logger');
var RedisStore = require('connect-redis');
var FileStore = require('connect-file-store');

var session = require('express-session');
var expressErrorHandler = require('express-error-handler');


var redis = require('redis');
var cookieParser = require('cookie-parser');

var session = require('express-session');
var RedisStore = require('connect-redis')(session);


var config = {
    development: {
        redis: { port: 6379, host: '127.0.0.1', db: 'broker_sessions' },
        broker: { url: "http://localhost", port: 5100 },
        // broker: { url: "http://broker.asianstyle.cz", port: 80 },
        default_acc_balance: 50000,
        port: 5001,
        debug_level: "dev"
    },
    production: {
        redis: { port: 4379, host: '127.0.0.1', db: 'broker_sessions' },
        broker: { url: "http://broker.asianstyle.cz", port: 80 },
        dbUrl: 'mongodb://localhost/broker',
        //dbUrl: 'mongodb://broker:brokeradmin@localhost/broker',
        default_acc_balance: 50000,
        port: 5000,
        debug_level: ""
    }
}

module.exports = function(express, app, root_path) {

    // development only
    if ('development' == app.get('env')) {
        app.use(expressErrorHandler());
    }

    app.set('brokerServer', config[app.get('env')].broker);
    app.set("config", config[app.get('env')]);

    app.engine('ejs', engine);

    app.use(express.static(path.join(root_path, 'public')));

    app.use(connect.logger( app.get("config").debug_level));

    app.use(methodOverride());
    app.use(expressLayouts);
    // app.use(express.favicon());
    // app.use(expressUrlEncoded());
    app.use(expressJson());

    app.use(cookieParser());
    app.use(bodyParser());

    app.use(connect.cookieParser());

    var client = redis.createClient( app.get("config").redis.port, app.get("config").redis.host);


    client.on("error", function (err) {
      console.log( ("Redis error encountered" + JSON.stringify( String(err) )).red);
    });

	var off = 30*24*60*60*1000* 12 * 10;
    app.use(connect.session({
            secret: 'secret',
            key: 'parada',
            store: new RedisStore(app.get("config").redis),
            cookie: {
    			expires: new Date(Date.now() + off),
            	maxAge: off
            }
        }));


        app.use(function(req, res, next) {

            if (!req.session)
                return res.send("Chyba při práci se session. Nepodařilo se připojit k Redis serveru.");
            next();
        });

        app.use(common.createLocals(app));

        app.use(passport.initialize()); app.use(passport.session()); app.use(flash());

        // all environments
        app.set('port', process.env.PORT || config[app.get('env')].port); app.set('views', path.join(root_path, 'views')); app.set('view engine', 'ejs'); app.set('layout', 'layout')


    }