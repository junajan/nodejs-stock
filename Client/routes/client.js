module.exports = function(app, login) {
	var client = require('../modules/client')(app);

    // ================================
    // unAuthorized ONLY
    // ================================
    // get requests
    app.get('/login', login.unAuthenticatedOnly, client.login);
    app.get('/registration', login.unAuthenticatedOnly, client.registration);

    // post requests
    app.post('/login', login.authenticate, client.doLogin);
    
    // ================================
    // authorized ONLY
    // ================================
	app.get('/logout', login.authenticatedOnly, client.logout);

    // for authorized send always SPA app, it will handle the rest
	app.get('/', login.authenticatedOnly, client.index);
	app.get('*', login.authenticatedOnly, client.index);
};
