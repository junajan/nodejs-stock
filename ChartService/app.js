/**
 * New beautiful app!
 */
var express = require('express');
var http = require('http');
var reload = require('reload');
var async = require('async');
var app = express();
var server = http.createServer(app);

/**
 * Configure express
 */
app.use (function (req, res, next) {

    res.locals = {
      ADDR: req.url.replace(/\/*$/, "")+"/"
    };
    next();
});


require ( "./config/public")( express, app, __dirname);
app.set("DB", require ( "./modules/DB")( app.get("config")));

require ("./marketClient")(server, app);

/**
 * Use livereload for development
 */
if(app.get("config").livereload)
	reload(server, app, 1000);

/**
 * Add routes
 */
require ("./routes/general")( app );

/**
 * Start server
 */
server.listen(app.get('port'), function () {
	console.log('Express server listening on port '+ app.get('port'));
});
