var DB = {};

DB.instance = null;
module.exports = function(conf) {

    if ( DB.instance == null)
        DB.instance = new require("mongojs").connect(conf.db.url, conf.db.collections);
    return DB.instance;
};