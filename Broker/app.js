var express = require('express');
var colors = require('colors');
var http = require('http');
var reload = require('reload');
var app = express();
var async = require('async');
var mongoose = require("mongoose");
var Events = require("./modules/events");

// disable socket-io-client debug log 
require('debug').disable('socket.io-client:manager');

// Configure express
require ( "./config/public")( express, app, __dirname);

// Connect to DB
mongoose.connect( app.get("config").dbUrl);
mongoose.connection.on('error', function(err) {

	if (err) {
		console.log("Chyba pri pripojovani se k databazi.".red );
		process.exit(1);
	}
});

// Start HTTP server
var server = http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

if(app.get("config").livereload)
	reload(server, app, 1000);

// Create 
require ("./clientServer")( server, app );
require ("./marketClient")( server, app );

require ("./routes/clientRest")( app );
require ("./routes/brokerRest")( app );
require ("./routes/brokerPage")( app );

