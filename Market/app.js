/**
 * New beautiful app!
 */
var express = require('express');
var http = require('http');
var reload = require('reload');
var app = express();
var async = require('async');
var log = require('./modules/Log')("APP", true, true);
var DB = null;

var server = http.createServer(app);
var router = express.Router();
var routerApi = express.Router();

async.waterfall([
	function(done) {
		/**
		 * Configure express
		 */
		require("./config/public")(express, app, __dirname);
		done(null);
	},
	function(done) {
		/**
		 * Pripojeni k databazi
		 */
		require("./modules/Db").init(app.get("config").db_url, done);
	},
	function(dbConnection, done) {
		/**
		 * Nastaveni pristupu k databazi
		 */
		DB = dbConnection;
		app.set("DB", dbConnection);
		done(null);
	},
	function(done) {
		/**
		 * Spusteni monitoringu
		 */
		
		if(app.get("NODETIME"))
			require('nodetime').profile(app.get("config").nodetime);
		done(null);
	},
	function(done) {
		/**
		 * Spusteni marketu
		 */
	    log.event('Spoustim market server.');
		require("./marketServer")(server, app);
		done(null);
	},
	function(done) {
		/**
		 * Setup web routers 
		 */
		if(app.get("config").livereload)
			reload(server, app, 1000); // reload browser when changed
		
		app.use(require("./routes/webApi")(app, routerApi));
		app.use(require("./routes/web")(app, router));

		done(null);
	},
	function(done) {
		/**
		 * Run web server
		 */
	    log.event('Spoustim HTTP server na portu ' + app.get('port'));
		server.listen(app.get('port'), function() {
		    log.event('Express server byl spusten');
		});
		done(null);
	},
	function(done) {

		// never stop
	},
	],
	function(err, res) {
		// when server gracefully end
		
		if(err)
			log.error("Server is stopping with err.", err);
		else
			console.log("Gracefull stop.");
});

