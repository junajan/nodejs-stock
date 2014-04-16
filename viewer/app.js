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

app.use (  function (req, res, next) {

    res.locals = {
      ADDR: req.url.replace(/\/*$/, "")+"/"
    };
    next();
});


require ( "./config/public")( express, app, __dirname);
var DB = require ( "./modules/db")( app.get("dbConfig") );

app.set("mongo", DB );


/**
 * Start server
 */
var server = http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

require ("./socketServer")( server, app );

/**
 * For debug purpose - this will reload client on each server change
 */
reload(server, app, 1000);

/**
 * Add routes
 */

require ("./routes/general")( app );

