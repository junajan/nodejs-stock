/**
 * New beautiful app!
 */
var express = require('express');
var http = require('http');
var reload = require('reload');
var app = express();
var async = require('async');
var passport = require("passport");


// system config
require ( "./config/public")( express, app, __dirname);

// start HTTP server
var server = http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

// run socket.IO
var io = require('socket.io').listen(server, { log: false });

// use livereload for development env
if(app.get("config").livereload)
	reload(server, app, 1000);

// passport login will handle login
var login = require("./modules/passportLogin")( app );

// define routes in application
require ("./routes/client")( app, login );

