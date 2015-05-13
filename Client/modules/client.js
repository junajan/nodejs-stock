var async = require("async");
var randString = require("generate-key");
var sha1 = require("sha1");
var view_dir = 'unauth/';
var layout = view_dir + "layout.ejs";

/**
 * Class managing API calls from client
 */
var ClientController = function(app) {

    console.log("Loading Client controller");

    /**
     * Send SPA application to client
     */
    this.index = function(req, res) {

        config = app.get("brokerServer");
        config.key = req.user.key;

        res.render('auth/app', {
            layout: "auth/layout.ejs",
            config: config,
            config_chart: app.get("config").charts
        });
    };

    /**
     * Send registraton page
     */
    this.registration = function(req, res) {

        res.render(view_dir + 'registration', {
            layout: layout,
            title: "Registrovat"
        });
    };

    /**
     * Send login page
     */
    this.login = function(req, res) {

        res.render(view_dir + 'login', {
            layout: layout,
            title: "Login",
            show_message: (typeof req.query.bad_credentials != "undefined"),
            message: req.flash('error')
        });
    };

    /**
     * Handle login request
     */
    this.doLogin = function(req, res) {

        res.render(view_dir + 'login', {
            layout: layout,
            title: "Login",
            show_message: (typeof req.query.bad_credentials != "undefined"),
            message: req.flash('error')
        });
    };

    /**
     * Logout from services
     */
    this.logout = function(req, res) {

        req.logout();
        res.redirect('/');
    };

    return this;
};


ClientController.instance = null;
module.exports = function(app) {

    if (null === ClientController.instance)
        ClientController.instance = new ClientController(app);
    return ClientController.instance;
};