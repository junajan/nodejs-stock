
var DB = {};

DB.instance = null;
module.exports = function(conf) {

    if ( DB.instance == null)
        DB.instance = new require("mongojs").connect(conf.dbUrl, conf.collections);

    return DB.instance;
}