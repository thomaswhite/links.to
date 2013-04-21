/**
 * Created with JetBrains WebStorm.
 * User: Thomas
 * Date: 14/07/12
 * Time: 09:20
 * To change this template use File | Settings | File Templates.
 *
 * Set up user authentication
 *
 */

var _ = require('underscore');
var passport = require('passport');
var logger = require('nlogger').logger(module);
var utils = require('./../tw-utils.js');
var gravatar = require('gravatar');
var async = require('async');
// var logger  = require('nlogger').logger(module);

var context;

function addUserImageURL( profile ){
    var settings = context.settings.gravatar;
    var settings96 = _.defaults({s:96}, context.settings.gravatar );

    if( profile && profile.email ){
        var email =  profile.email || 'noemail@nodomain.com';

        if(!profile.gravatarURL  ){
            profile.gravatarURL =  gravatar.url( email, settings );
        }
        if(!profile.gravatarURL96  ){
            profile.gravatarURL96 =  gravatar.url(  email, settings96 );
        }
        if(!profile.gravatarURL_https  ){
            profile.gravatarURL_https =  gravatar.url(  email, settings, true );
        }
        if( !profile.gravatarURL96_https ){
            profile.gravatarURL96_https =  gravatar.url(  email, settings96, true );
        }
    }
    return profile;
}

module.exports = {
    init: function ( Context, init_callback ){

        // It's up to us to tell Passport how to store the current user in the session, and how to take
        // session data and get back a user object. We could store just an id in the session and go back
        // and forth to the complete user object via MySQL or MongoDB lookups, but since the user object
        // is small, we'll save a round trip to the database by storign the user
        // information directly in the session in JSON string format.

        context = Context;
        var app = context.app;

  //    logger.info('Config passport started.');

        function getUserForOpenID( err, openID_found, callback ){
            if( err ){
                callback(err);
            }else{
                context.db.users.findUserForOpenID( openID_found, callback );
            }
        }

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

        var googleSettings = context.settings.passport.google;
        var GoogleStrategy = require(googleSettings.require).Strategy;
        passport.use(new GoogleStrategy( googleSettings,
            function(identifier, profile, done) {
                process.nextTick(function(){
                    logger.info(profile);
                    context.db.openIDs.findOrCreate( 'google', addUserImageURL( utils.pick( profile, googleSettings.pick )), function(err, openID_found ){
                        getUserForOpenID(err, openID_found, done);
                    });

                });
            }
        ));
        var yahooSettings = context.settings.passport.yahoo;
        var YahooStrategy = require(yahooSettings.require).Strategy;
        passport.use(new YahooStrategy( yahooSettings,
            function(identifier, profile, done) {
                process.nextTick(function(){
                    logger.info(profile);
                    context.db.openIDs.findOrCreate( 'yahoo', addUserImageURL( utils.pick( profile, yahooSettings.pick ), profile), function(err, openID_found ){
                        getUserForOpenID(err, openID_found, done);
                    });
                });
            }
        ));

        var twitterSettings = context.settings.passport.twitter;
        var TwitterStrategy = require(twitterSettings.require).Strategy;
        passport.use(new TwitterStrategy(twitterSettings,
            function(token, tokenSecret, profile, done) {
                process.nextTick(function(){
                    logger.info(profile);
                    context.db.openIDs.findOrCreate( 'twitter', addUserImageURL(utils.pick( profile, twitterSettings.pick ), profile), function(err, openID_found ){
                        getUserForOpenID(err, openID_found, done);
                    });
                });
            }
        ));

        var facebookSettings = context.settings.passport.facebook;
        var facebookStrategy = require(facebookSettings.require).Strategy;
        passport.use(new facebookStrategy(facebookSettings,
            function(token, tokenSecret, profile, done) {
                process.nextTick(function(){
                    logger.info(profile);
                    context.db.openIDs.findOrCreate( 'facebook', addUserImageURL(utils.pick( profile, facebookSettings.pick ), profile ), function(err, openID_found ){
                        getUserForOpenID(err, openID_found, done);
                    });
                });
            }
        ));


        var windowsliveSettings = context.settings.passport.windowslive;
        var windowsliveStrategy = require(windowsliveSettings.require).Strategy;
        passport.use(new windowsliveStrategy(windowsliveSettings,
            function(token, tokenSecret, profile, done) {
                process.nextTick(function(){
                    logger.info(profile);
                    context.db.openIDs.findOrCreate( 'facebook', addUserImageURL(utils.pick( profile, windowsliveSettings.pick ), profile ), function(err, openID_found ){
                        getUserForOpenID(err, openID_found, done);
                    });
                });
            }
        ));

        var dropboxSettings = context.settings.passport.dropbox;
        var dropboxStrategy = require(dropboxSettings.require).Strategy;
        passport.use(new dropboxStrategy(dropboxSettings,
            function(token, tokenSecret, profile, done) {
                process.nextTick(function(){
                    logger.info(profile);
                    context.db.openIDs.findOrCreate( 'dropbox', addUserImageURL(utils.pick( profile, dropboxSettings.pick ), profile), function(err, openID_found ){
                        getUserForOpenID(err, openID_found, done);
                    });
                });
            }
        ));

        var meetupSettings = context.settings.passport.meetup;
        var meetupStrategy = require(meetupSettings.require).Strategy;
        passport.use(new meetupStrategy(meetupSettings,
            function(token, tokenSecret, profile, done) {
                process.nextTick(function(){
                    logger.info(profile);
                    context.db.openIDs.findOrCreate( 'meetup', addUserImageURL(utils.pick( profile, meetupSettings.pick ), profile), function(err, openID_found ){
                        getUserForOpenID(err, openID_found, done);
                    });
                });
            }
        ));

        var linkedinSettings = context.settings.passport.linkedin;
        var linkedinStrategy = require(linkedinSettings.require).Strategy;
        passport.use(new linkedinStrategy(linkedinSettings,
            function(token, tokenSecret, profile, done) {
                process.nextTick(function(){
                    logger.info(profile);
                    context.db.openIDs.findOrCreate( 'linkedin', addUserImageURL(utils.pick( profile, linkedinSettings.pick ), profile), function(err, openID_found ){
                        getUserForOpenID(err, openID_found, done);
                    });
                });
            }
        ));

        app.use(passport.initialize());
        app.use(passport.session());

        app.get('/auth/google',           passport.authenticate('google'));
        app.get('/auth/google/callback',  passport.authenticate('google',  context.settings.passport_after));

        app.get('/auth/yahoo',           passport.authenticate('yahoo'));
        app.get('/auth/yahoo/callback',  passport.authenticate('yahoo',  context.settings.passport_after));

        app.get('/auth/twitter',           passport.authenticate('twitter'));
        app.get('/auth/twitter/callback',  passport.authenticate('twitter',  context.settings.passport_after));

        app.get('/auth/facebook',           passport.authenticate('facebook'));
        app.get('/auth/facebook/callback',  passport.authenticate('facebook',  context.settings.passport_after));

        app.get('/auth/dropbox',           passport.authenticate('dropbox'));
        app.get('/auth/dropbox/callback',  passport.authenticate('dropbox',  context.settings.passport_after));

//        app.get('/auth/windowslive',           passport.authenticate('windowslive'));
//        app.get('/auth/windowslive/callback',  passport.authenticate('windowslive',  context.settings.passport_after));

        app.get('/auth/meetup',           passport.authenticate('meetup'));
        app.get('/auth/meetup/callback',  passport.authenticate('meetup',  context.settings.passport_after));

        app.get('/auth/linkedin',           passport.authenticate('linkedin'));
        app.get('/auth/linkedin/callback',  passport.authenticate('linkedin',  context.settings.passport_after));

        app.get('/logout', function(req, res){
            var referer = req.headers.referer;
            req.logOut();
            if(  context.settings.passport_after.logoutRedirect ){
                res.redirect(context.settings.passport_after.logoutRedirect);
            }else{
                res.redirect( referer );
            }
        });



        app.get('/auth-after-success', function(req, res){
            var User = addUserImageURL( req.user );
            console.log('\n/auth-after-success', '\nUSER:', req.user );
            context.db.users.getActiveOpenID(0, User, function(err, OpneID ){
                console.log('\n/auth-after-success', '\nOpenID:', OpneID );
            });

            if( req.user && ( req.user.email || req.user.emailPinged )){
                res.redirect( context.settings.passport_after.userHasEmail );
            }else{
                context.Page2(req, res, 'user_request-email', {
                    user:User,
                    formURL:'/secret/ping-email',
                    slots:{
                    title2:'User registration',
                    crumbs : 'No breadcrumbs'

                   }
                });
            }

        });

        app.post('/secret/ping-email', function( req, res){
            if( req.user && req.body.email){
                context.db.emails.ping(req.body.email, req.user._id, req.user.active_openID,  req.user.provider, function(err, email ){
                    if( err ){
                        console.log(err);
                    }else{
                        var host = req.host;
                        var link = req.protocol + '://' + host + ':' + context.settings.http.port + '/confirm/alabala/' + email._id;

                        context.db.users.update( req.user._id, { emailPinged:true });

                        context.mailer.send({
                            from: "links.to.com@gmail.com",
                            to: req.body.email,
                            subject: "Confirm your registration",
                            html: "<p>Please confirm your registration by clicking on <a href='" + link + "' >this link </a>.</p>"
                        });

                        context.Page2(req, res, 'user_request-email_sent', {
                            email: req.body.email
                        });
                        //res.redirect(context.settings.passport_after.afterEmailPing);
                    }
                });

            }else{
                context.notFound(res);
            }
        });


        app.get('/confirm/alabala/:emailID', function( req, res){
            context.db.emails.activate(req.params.emailID, function(err, Email){
                console.log(Email);
                context.Page2(req, res, 'user_request-email_clicked', {
                    email:    Email.email,
                    provider: Email.provider
                });
                // res.redirect(context.settings.passport_after.afterEmailVerified);
            });
        });

        //logger.info('Config passport completed.');
        init_callback ();
    }
};
