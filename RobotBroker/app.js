/**
 * New beautiful app!
 */
var express = require('express');
var app = express();
var http = require('http');
var reload = require('reload');
var async = require('async');
var mongoose = require("mongoose");
var server = http.createServer(app);

/**
 * Configure express
 */
require ( "./config/public")( express, app, __dirname);
mongoose.connect( app.get("config").dbUrl );
mongoose.connection.on('error', function(err) {
	if (err) {
		console.log("Chyba pri pripojovani se k databazi.".red );
		process.exit(1);
	}
});

/**
 * Add routes
 */
reload(server, app, 1000);
require ("./routes/robotRest")( app );
require ("./routes/robotPage")( app );

/**
 * Start server
 */
server.listen(app.get('port'), function () {
  	console.log('Express server listening on port '+ app.get('port'));
});

require ("./robot")( server, app );
