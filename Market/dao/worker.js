var colors = require("colors");
var log = require("../modules/Log")("Worker", true, true);

var Worker = function (app) {

    var DB = app.get("DB");
    var self = this;
    
    /**
     * Vrati vsechny workery
     */
    this.findAll = function(done) {
        DB.ps(done, 'SELECT * FROM get_strikers();');
    };

    /**
     * Vyradi workera ze seznamu
     */
    this.remove = function(ip, port) {
        DB.ps(function(err, res){}, "SELECT unregister_striker($1, $2);", [ip, port]);
    };
    
    return this;
};

// singleton
Worker.instance = null;
module.exports = function( app ) {

    if ( Worker.instance === null )
        Worker.instance = new Worker( app );

    return Worker.instance;
};
