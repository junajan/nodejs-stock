/**
 * New beautiful app!
 */
var express = require('express');
var http = require('http');
var reload = require('reload');
var app = express();
var async = require('async');
var passport = require("passport");
// var mongoose = require("mongoose");

// pripojeni k databazi brokera

// process.on('uncaughtException', function(err) {
//   console.log('Caught exception: ' + err);
// });


// konfigurace systemu
require ( "./config/public")( express, app, __dirname);
// mongoose.connect( app.get("config").dbUrl );

// start HTTP server
var server = http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

// spustime socket.IO server 
var io = require('socket.io').listen(server, { log: false });

// reload klienta pri restartu serveru - JEN PRO DEVELOPMENT
reload(server, app, 1000);

// passport login obsluhuje prihlaseni
login = require("./modules/passportLogin")( app );

// pridani obsluhujicich metod pro dane adresy
require ("./routes/client")( app, login );

