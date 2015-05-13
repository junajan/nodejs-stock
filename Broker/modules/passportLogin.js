var passport = require("passport");
var sha1 = require("sha1");
var LocalStrategy = require('passport-local').Strategy;
var Client = require("../mongoose/client");
var log = require('./log')(false, false);


passport.serializeUser(function(user, done) {

    done(null, user._id);
});

passport.deserializeUser(function(id, done) {

    Client.findOne({
        _id: id
    }, function(err, user) {

        done(err, user);
    });
});

passport.use(new LocalStrategy(function(username, password, done) {

    Client.findOne({
        email: username
    }, function(err, user) {

        if (err)
            return done(err);

        if (!user) {
            return done(null, false, {
                message: 'Incorrect email.'
            });
        }

        hash(password, user.salt, function(err, hash) {

            if (err) {
                return done(err);
            }
            if (hash == user.password) {
                return done(null, user);
            }
            done(null, false, {
                message: 'Incorrect password.'
            });
        });
    });
}));


var Login = {

    authenticatedOnly: function(req, res, next) {
        if (req.isAuthenticated()) {
            next();
        } else {
            res.redirect("/login");
        }
    },

    unAuthenticatedOnly: function(req, res, next) {
        if (req.isAuthenticated()) {
            res.redirect("/");
        } else {
            next();
        }
    },

    userExist: function(req, res, next) {
        Client.count({
            username: req.body.username
        }, function(err, count) {
            if (count === 0) {
                next();
            } else {
                // req.session.error = "User Exist"
                res.redirect("/singup");
            }
        });
    },

    hash: function(pass, salt, cb) {

        pass = sha1(pass + "-" + salt);
        if (!cb) return pass;

        cb(null, pass);
    },

    authenticate: passport.authenticate('local', {
        successRedirect: '/',
        failureRedirect: '/login?bad_credentials'
    }),

    passport: passport
};


module.exports = Login;