var path = require('path');
// var expressLayouts = require('express-ejs-layouts')
// var expressMethodOverride = require('method-override');
var bodyParser = require('body-parser');
var express = require('express');
var engine = require('ejs-locals');
var _ = require('underscore');

var commonConfig = {
	emissionBroker: {
		id: 0,
	},
	workers: {
	    maxConnectAttempts: 5,		// max pocet pokusu o pripojeni k workeru
		connectAttemptTimeout: 5000,	// delay mezi pokusy o pripojeni
		refreshWorkersInterval: 10000, // nacitat seznam workeru v intervalu 10ti sekund
	},
	allowedPriceChange: 30,
	orderMatchingDelay: 2000,		// ms to delay first tick
	orderMatchingInterval: 1000,	// ms for tick interval delay
	expiryTTL: 15,					// seconds to expire order
};

var config = {
	development: {
		db_url: "postgres://market:market@localhost:5433/market",
		charts: {
			"port": 5400,
			"addr": "127.0.0.1"
		},
		port: 5555,
		livereload: true,
		nodetime: {
			appName: "Market DEV",
			accountKey: "b3948b9ccfa5b6c2824a0763890467dc57b21fe8"
		}
	},
	production: {
		db_url: "postgres://market:market@localhost/market",
		charts: {
			"port": 5400,
			"addr": "biblio.stare.cz"
		},
		port: 5555,
		livereload: false,
		nodetime: {
		    accountKey: 'f89ccacbd4b40aa5698234d5888bfaf4efc39ea6', 
		    appName: 'Market Biblio'
		}
	}
};

var globalConfig = {
	DEBUG: true,
	NODETIME: true,
	restApiLoc: "/api/",
	startTime: Date.now(),
};

module.exports = function(express, app, root_path) {

	if (!~(["development", "production"].indexOf(app.get('env')))) {
		console.log("Bad environment! Must be development or production.");
		process.exit(1);
	}
	
	// nastaveni jadra marketu
	config[app.get('env')].core = commonConfig;

	// ========== Ulozime si nastaveni ===============
	_.each(globalConfig, function(value, key) {
		app.set(key, value);
		config[app.get('env')][key] = value;
	});
	app.set("config", config[app.get('env')]);

	// ========== Nastaveni expressu =================
	app.engine('ejs', engine);
	app.use(express.static(path.join(root_path, 'web/public')));
	app.use(bodyParser.urlencoded({extended: true}));
	app.use(bodyParser.json());
	
	// all environments
	app.set('port', process.env.PORT || config[app.get('env')].port);
	app.set('views', path.join(root_path, 'web'));
	app.set('view engine', 'ejs');
	app.set('layout', 'layout');
};
