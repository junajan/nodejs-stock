/**
 * New beautiful app!
 */
var express = require('express');
var http = require('http');
var reload = require('reload');
var app = express();
var async = require('async');
// var passport = require("passport");
var mongoose = require("mongoose");
var Events = require("./modules/events");

 
// process.on('uncaughtException', function(err) {
//   console.log('Caught exception: ' + err);
// });

/**
 * Configure express
 */
require ( "./config/public")( express, app, __dirname);
mongoose.connect( app.get("config").dbUrl );

/**
 * Start server
 */
var server = http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

reload(server, app, 1000);

require ("./clientServer")( server, app );
require ("./broker")( server, app );


// login = require("./modules/passportLogin");

/**
 * Add routes
 */
require ("./routes/clientRest")( app );
require ("./routes/brokerRest")( app );
require ("./routes/brokerPage")( app );
