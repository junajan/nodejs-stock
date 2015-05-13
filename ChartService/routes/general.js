var routes = require('../modules/Index');
var cors = require('cors');

module.exports = function(app) {
    
    var RestApi = require('../modules/RestApi')(app);

    /**
     * Allow CORS request on this server
     */
    app.use(cors());
    // app.all('*', function(req, res, next) {
    //     res.header("Access-Control-Allow-Origin", "*");
    //     res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,HEAD,DELETE,OPTIONS');
    //     res.header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type");
    //     next();
    // });
    // app.options('*', function(req, res, next) {
    //     res.send( 200 );
    // });
    
    // =========== API routes
    app.get('/api/stock-list/', RestApi.getStockList );
    app.get('/api/stock-detail/:ticker', RestApi.getStockDetail );
    app.get('/api/stock-history/:ticker/', RestApi.getStockHistory );

    // =========== WEB routes
	app.get('*', routes.index);
};
