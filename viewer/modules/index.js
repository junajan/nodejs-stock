var db = require ("./db")();
var server = require("./viewerApi")();

exports.index = function(req, res) {
    res.render('app');
    res.end();
};

exports.stockList = function(req, res) {

    db.stocks.find({}, function(err, data) {
        if (err) {

            console.log("Error while reading data.");
            return res.send("ERROR");
        }

        res.render('stockList', {
            data: data
        });
        res.end();
    });
};

exports.stockDetail = function(req, res) {

    db.stocks.findOne({code: req.params.code}, function(err, data) {
        if (err) {

            console.log("Error while reading data.");
            return res.send("ERROR");
        }

        res.render('stockDetail', {
            info: data
        });
        res.end();
    });
};

exports.stockHistory = function ( req, res ) {

    if ( ! req.query.last )
        req.query.last = 0;

    var data = server.getChartData ( req.params.code, req.params.type, parseInt( req.query.last ) );
    // console.dir ( data );

	res.send( data );
    res.end();
}

exports.getCodes = function(req, res) {
    res.render('app');
    res.end();
};

exports.error404 = function(req, res) {
    res.render('error404');
    res.end();
};