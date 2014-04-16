var async = require("async");
var randString = require("generate-key");

var sha1 = require("sha1");

var view_dir = 'unauth/';
var layout = view_dir+"layout.ejs";

hash = function ( pass, salt, cb ) {

    pass = sha1 ( pass+"-"+salt );
    if ( ! cb ) return pass;
    
    cb ( null, pass );
}

var ClientApi = function ( app ) {

    console.dir ( "Loading client API" );
    
    this.index = function ( req, res ) {

        config = app.get("brokerServer");
        config.key = req.user.key;

        res.render('auth/app', {layout: "auth/layout.ejs", config: config });
    }

    this.lostPass = function ( req, res ) {

        res.render( view_dir+'lost_pass', {layout: layout, email: "", msg: "", title: "Zapomenuté heslo"});
    };
    
    this.registration = function ( req, res ) {

        res.render(view_dir+'registration', {layout: layout, title: "Registrovat"});
    };

    this.login = function ( req, res ) {

        res.render(view_dir+'login', {
            layout: layout,
            title: "Login",
            show_message: (typeof req.query.bad_credentials != "undefined"),
            message: req.flash('error')
        });
    };

    this.doLogin = function ( req, res ) {

        res.render(view_dir+'login', {
            layout: layout,
            title: "Login",
            show_message: (typeof req.query.bad_credentials != "undefined"),
            message: req.flash('error')
        });
    }


    this.logout = function ( req, res ) {

        req.logout();
        res.redirect('/');
    };
    
    return this;
};


ClientApi.instance = null;
module.exports = function ( app ) {

    if ( null === ClientApi.instance ) 
        ClientApi.instance = new ClientApi ( app );

    return ClientApi.instance;
}