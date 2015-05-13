module.exports = function(app, router) {
	var stock = require('../modules/WebRestApi')(app);

	// this will send angular app - can be replaced by some CDN service
	router.get('*', function(req, res) {
        res.render('app', {conf_charts: app.get("config").charts});
    });

    return router;
}
