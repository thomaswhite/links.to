/**
 * Created with JetBrains WebStorm.
 * User: Thomas
 * Date: 04/03/13
 * Time: 00:13
 */
var debug = require('debug')('linksTo:passports');

var box = require('../box.js')
    , passport = require('passport')
    , config
    , app
    ;

box.passport = passport;

passport.serializeUser(function(user, done) {
    done(null, JSON.stringify(user));
});
passport.deserializeUser(function(json, done) {
    var user = JSON.parse(json);
    if (user){
        done(null, user);
    }else{
        done(new Error("Bad JSON string in session"), null);
    }
});

box.on('init', function (App, Config, done) {
    app = App;
    config = Config.passport;
    app.use(passport.initialize());
    app.use(passport.session());
    app.use(app.router);
    done(null, 'plugin passports initiated');
});
