/**
 * New beautiful app!
 */
var express = require('express');
var http = require('http');
var reload = require('reload');
var app = express();
var async = require('async');

/**
 * Configure express
 */
require ( "./config/public")( express, app, __dirname);
var DB = require ( "./modules/db")( app.get("dbConfig") );
app.set("mongo", DB );


/**
 * Start server
 */
var server = http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

require ("./marketServer")( server, app );

/**
 * For debug purpose - this will reload client on each server change
 */
reload(server, app, 1000);

/**
 * Add routes
 */

require ("./routes/general")( app );

