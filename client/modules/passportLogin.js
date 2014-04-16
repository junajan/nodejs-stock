var passport = require("passport");
var sha1 = require("sha1");
var LocalStrategy = require('passport-local').Strategy;
var request = require('request');

module.exports = function ( app ) {

    passport.serializeUser(function(user, done) {

        done( null, user.key );
    });

    passport.deserializeUser(function(key, done) {

        done( null, { key: key });
    });

    function getLoginKey ( user, pass, cb ) {

        var brokerConfig = app.get("brokerServer");
        var brokerUrl = brokerConfig.url+":"+brokerConfig.port + '/client-rest/login';

        request.post( 
            brokerUrl,
            { form: { user: user, pass: pass }},
            function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    body = JSON.parse ( body );

                    if ( body.valid == 1 )
                        return cb ( null, body.key );

                    if ( body.valid == 0 )
                        return cb ( "Chybné přihlašovací údaje.", false );

                    return cb ( "Při práci s API došlo k chybě.", false );
                }

                return cb ( "Při spojení s brokerem došlo k chybě.", false );
        });
    }

    // pri prihlasovani se dotazeme na vzdaleny server, kde dojde k overeni udaju
    passport.use(new LocalStrategy(function(username, password,done){

        getLoginKey ( username, password, function ( err, key ) {

            if ( err )
                return done(null, false, { message: err });

            // a podle vysledku vratime klic
            return done(null, {key: key} );
        });
    }));


    var Login = {

        // pokud uzivatel neni prihlasen na strance s prihlasenim - presmeruj na login
        authenticatedOnly: function (req, res, next){

            if(req.isAuthenticated()){
                next();
            }else{
                res.redirect("/login");
            }
        },

        // pokud je clovek prihlaseny na strance pro neprihlasene, presmeruj na/
        unAuthenticatedOnly: function (req, res, next){
            if(req.isAuthenticated()){
                res.redirect("/");
            }else{
                next();
            }
        },

        userExist: function (req, res, next) {
            Client.count({
                username: req.body.username
            }, function (err, count) {
                if (count === 0) {
                    next();
                } else {
                    // req.session.error = "User Exist"
                    res.redirect("/singup");
                }
            });
        },

        hash: function ( pass, salt, cb ) {

            pass = sha1 ( pass+"-"+salt );
            if ( ! cb ) return pass;

            cb ( null, pass );
        },

        // nastaveni modulu passport.js
        authenticate: passport.authenticate('local', 
                        { 
                            successRedirect: '/', 
                            failureRedirect: '/login?bad_credentials',
                            failureFlash: true,
                            badRequestMessage: 'Chybné přihlašovací údaje.' 
                        }),

        passport: passport
    }

    return Login;
}