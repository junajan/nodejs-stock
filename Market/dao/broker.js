var colors = require("colors");
var log = require("../modules/Log")("Broker", true, true);

var Broker = function ( app ) {

    var DB = app.get("DB");
    var TABLE = "brokers";
    var self = this;
    /**
     * Vrati vsechny brokery
     */
    this.findAll = function(done) {
        DB.ps(done, 'SELECT * FROM get_brokers()');
    };

    /**
     * Najde brokera podle ID
     */
    this.find = function (id, done) {
        DB.ps( done, "SELECT * FROM get_broker($1) as broker;", id);
    };

    /**
     * Najde brokera podle ID
     */
    this.findByName = function (name, done) {
        DB.ps( done, "SELECT * FROM get_broker_by_name($1) as broker;", name);
    };

    /**
     * Vytvori brokera
     */
    this.insert = function(data, done) {

        // _company_id integer, _issued date, _shares integer, _ticker varchar,  _name varchar, _price numeric
        DB.ps(done, "SELECT create_broker($1, $2);", [data.name, data.token]);
    };

    /**
     * Updatuje brokera
     */
    this.update = function (id, data, done) {
        var n = {
            name: data.name,
            token: data.token,
        };
        DB.update ( done, TABLE, n, "id = "+id );
    };

    /**
     * Vrati seznam akcii brokera
     */
    this.getBrokerStocks = function(id, done) {
        DB.ps( done, "SELECT * FROM get_ownerships($1) as stocks;", id);
    };

    /**
     * Vrati pocet brokeru
     */
    this.getCount = function(done) {
        function res ( err, res) {
            if(err)
                return done(err);
            done(null, res[0].count);
        }

        DB.sql(res, "SELECT COUNT(*) FROM get_brokers()");
    };

    return this;
};

// singleton
Broker.instance = null;
module.exports = function( app ) {

    if ( Broker.instance == null )
        Broker.instance = new Broker( app );

    return Broker.instance;
};
