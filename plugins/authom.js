/**
 * Created with JetBrains WebStorm.
 * User: Thomas
 * Date: 04/03/13
 * Time: 00:13
 */
var debug = require('debug')('linksTo:authom');

var box = require('../lib/box')
    , authom = require("authom")
    , config
    , app
    ;

/*
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
    var ts = new Date().getTime();
    app = App;
    config = Config.passport;
    app.use(passport.initialize());
    app.use(passport.session());
    app.use(app.router);
    box.utils.later( done, null, '+' + ( new Date().getTime() - ts) + 'ms plugin "Passport" initialised.');
});
*/