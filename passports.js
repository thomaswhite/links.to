/**
 * Created with JetBrains WebStorm.
 * User: Thomas
 * Date: 04/03/13
 * Time: 00:13
 * To change this template use File | Settings | File Templates.
 */

var _ = require('lodash')
    , passport = require('passport')
//    , logger = require('nlogger').logger(module)
    , utils = require('./tw-utils.js')
    , gravatar = require('gravatar')
    , inspect = require('eyes').inspector({
        styles: {                 // Styles applied to stdout
            all:     'cyan',      // Overall style applied to everything
            label:   'underline', // Inspection labels, like 'array' in `array: [1, 2, 3]`
            other:   'inverted',  // Objects which don't have a literal representation, such as functions
            key:     'bold',      // The keys in object literals, like 'a' in `{a: 1}`
            special: 'grey',      // null, undefined...
            string:  'green',
            number:  'magenta',
            bool:    'blue',      // true false
            regexp:  'green'      // /\d+/
        },
        pretty: true,             // Indent object literals
        hideFunctions: false,     // Don't output functions at all
        stream: process.stdout,   // Stream to write to, or null
        maxLength: 2048           // Truncate output if longer
    })
    , config
    , app
    , passports
    , emitter
    ;




function setPassport( settings, name, allPassports ){
    var strategy = require(settings.require).Strategy,
        pick = settings.pick;

    function save_Picked_data( originalProfile, Profile, callback ){
        Profile.provider = name;
        Profile.type="openID";
        emitter.waterfall('openID.authenticated', Profile, function(err, result){
            if( err ){
                callback(err);
            }else{
               callback( null, result.user );
            }
        });
    }
    function handleConnection_oauth2( accessToken, refreshToken, params, profile, callback ){
          if( arguments.length == 4 ){
              callback = profile;
              profile = params;
          }
        var picked  = utils.pick( profile, pick );
        picked.token = accessToken;
        save_Picked_data( profile, picked, callback );
    }
    function handleConnection( token, profile, pape, oath, callback ){
         switch( arguments.length ){
            case 5: break;
            case 4: callback = oath;    break;
            case 3: callback = pape;    break;
            case 2: callback = profile; break
         }

        var picked  = utils.pick( profile, pick );
        picked.token = token;
        save_Picked_data( profile, picked, callback );
            /*   context.db.openIDs.findOrCreate( name, addUserImageURL( utils.pick( profile, settings.pick )), function(err, openID_found ){
             getUserForOpenID(err, openID_found, done);
             });
             */
    }
    passport.use(new strategy( settings, settings.type === 'oauth2' ? handleConnection_oauth2 : handleConnection));
    app.get('/authenticate/'+ name,         passport.authenticate(name));
    app.get('/auth/' + name + '/callback',  passport.authenticate(name,  config.passport_after));
}

exports.init = passports = function( App, Config, Emitter ){
    app = App;
    config = Config;
    emitter = Emitter;

    emitter.on('openID.authenticated.disabled', function( Profile, callback  )  {
        console.log('openID.authenticated, profile:',  inspect(Profile) );
        callback( null, {type:'dummy'});
    });
    emitter.on('openID.beforeAuth', function(req, callback){
        console.log('openID.beforeAuth, req:',  inspect(req) );
       // save the page we are coming from so after authentication we can go back to the same page
        callback(null, 0);
    });
/*
    this.getUserForOpenID = function ( err, openID_found, callback ){
        if( err ){
            callback(err);
        }else{
            context.db.users.findUserForOpenID( openID_found, callback );
        }
    };
*/
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

    app.configure(function () {
        app.use(passport.initialize());
        app.use(passport.session());
    });

    app.get('/authenticate', function(req, res, next ){
        emitter.paralel('openID.beforeAuth', req, function (err, result) {
            next();
        })
    });

    _.each( config.passports, setPassport);

    app.get('/logout', function(req, res){
        var referer = req.headers.referer;
        req.logOut();
        delete app.locals.user;
        if(  config.passport_after.logoutRedirect ){
            res.redirect(config.passport_after.logoutRedirect);
        }else{
            res.redirect( referer );
        }
    });
    app.get('/auth-after-success', function(req, res){
        console.log('\n/auth-after-success', '\nUSER:', req.user );

        if( 1 || req.user && ( req.user.email || req.user.emailPinged )){
            app.locals.user = req.user;
            res.redirect( 'http://localhost:3000/#auth-after-success'  ); // config.passport_after.userHasEmail
        }else{
//            res.render('layout', { title: 'Express' });
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
                    var host = 'localhost' ; // req.host;
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
//        emitter.on('email.verified'
        context.db.emails.activate(req.params.emailID, function(err, Email){
            console.log(Email);
            context.Page2(req, res, 'user_request-email_clicked', {
                email:    Email.email,
                provider: Email.provider
            });
            // res.redirect(context.settings.passport_after.afterEmailcallback);
        });
    });

    return this;
};