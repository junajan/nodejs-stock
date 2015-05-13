var passport = require("passport");
var sha1 = require("sha1");
var LocalStrategy = require('passport-local').Strategy;
var request = require('request');

/**
 * This will handle user login 
 */
module.exports = function ( app ) {

    // serialize user data before it will be saved to storage
    passport.serializeUser(function(user, done) {

        done( null, user.key );
    });

    // deserialize user data from storage
    passport.deserializeUser(function(key, done) {

        done( null, { key: key });
    });

    /**
     * Call BrokerAPI /login to retrieve Auth token
     */
    function getLoginKey ( user, pass, cb ) {

        var brokerConfig = app.get("brokerServer");
        var brokerUrl = brokerConfig.url+":"+brokerConfig.port + '/client-rest/login';

        request.post(
            brokerUrl,
            { form: { user: user, pass: pass }},
            function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    body = JSON.parse ( body );

                    if ( body.valid === 1 )
                        return cb ( null, body.key );

                    if ( body.valid === 0 )
                        return cb ( "Chybné přihlašovací údaje.", false );

                    return cb ( "Při práci s API došlo k chybě.", false );
                }
                return cb ( "Při spojení s brokerem došlo k chybě.", false );
        });
    }

    // Configure passport module to use our getLoginKey
    passport.use(new LocalStrategy(function(username, password,done){

        // make login request to BrokerAPI
        getLoginKey ( username, password, function ( err, key ) {
            if ( err )
                return done(null, false, { message: err });
            return done(null, {key: key} );
        });
    }));

    /**
     * Used middlewares
     */
    var Login = {

        /**
         * Check if user is authenticated, if not, reload him to /login page
         */
        authenticatedOnly: function (req, res, next){
            if(!req.isAuthenticated())
                return res.redirect("/login");
            next();
        },

        /**
         * Check if user is not logged, if oposite, throw him to / page
         */
        unAuthenticatedOnly: function (req, res, next){
            if(req.isAuthenticated())
                return res.redirect("/");
            next();
        },

        // configure passport module
        authenticate: passport.authenticate('local', {
            successRedirect: '/',
            failureRedirect: '/login?bad_credentials',
            failureFlash: true,
            badRequestMessage: 'Chybné přihlašovací údaje.'
        }),
        passport: passport
    };

    return Login;
};