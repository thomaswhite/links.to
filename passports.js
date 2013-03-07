/**
 * Created with JetBrains WebStorm.
 * User: Thomas
 * Date: 04/03/13
 * Time: 00:13
 * To change this template use File | Settings | File Templates.
 */



var _ = require('underscore')
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


function addUserImageURL( profile ){
    var settings = context.settings.gravatar;
    var settings96 = _.defaults({s:96}, context.settings.gravatar );

    if( profile && profile.email ){
        var email =  profile.email || 'noemail@nodomain.com';

        if(!profile.profileImageURL  ){
            profile.profileImageURL =  gravatar.url( email, settings );
        }
        if(!profile.profileImageURL96  ){
            profile.profileImageURL96 =  gravatar.url(  email, settings96 );
        }
        if(!profile.profileImageURL_https  ){
            profile.profileImageURL_https =  gravatar.url(  email, settings, true );
        }
        if( !profile.profileImageURL96_https ){
            profile.profileImageURL96_https =  gravatar.url(  email, settings96, true );
        }
    }
    return profile;
}

function log(a1,a2,a3){
    console.log(inspect(a1), inspect(a2), inspect(a3) );
}




function setPassport( settings, name, allPassports ){
    var strategy = require(settings.require).Strategy,
        pick = settings.pick;

    function save_Picked_data( profile, picked, callback ){
        picked.provider = name;
        passports.paralel('openID.authenticated', picked, function(err, result){
            // the user is returned
            if( err ){
                callback(err);
            }else{
                if( result[0].fresh ){
                    passports.paralel('user.new.added', result[0], callback );
                }else{
                    callback( null );
                }
            }
        });
    };

    function handleConnection_oauth2( accessToken, refreshToken, params, profile, callback ){
          if( arguments.length == 4 ){
              callback = profile;
              profile = params;
          }
        var picked  = utils.pick( profile, pick );
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

    passports.on('openID.authenticated', function(a1  )  {
        console.log(inspect(profile) );
        console.log(inspect(picked ));
    //            callback( null, null, {user:'aaaa'}, {aa:1, bb:2});
    });


    // It's up to us to tell Passport how to store the current user in the session, and how to take
    // session data and get back a user object. We could store just an id in the session and go back
    // and forth to the complete user object via MySQL or MongoDB lookups, but since the user object
    // is small, we'll save a round trip to the database by storign the user
    // information directly in the session in JSON string format.


    this.getUserForOpenID = function ( err, openID_found, callback ){
        if( err ){
            callback(err);
        }else{
            context.db.users.findUserForOpenID( openID_found, callback );
        }
    };

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

    app.use(passport.initialize());
    app.use(passport.session());
    _.each( config.passports, setPassport);
    emitter(passports);

    app.get('/logout', function(req, res){
        var referer = req.headers.referer;
        req.logOut();
        if(  config.passport_after.logoutRedirect ){
            res.redirect(config.passport_after.logoutRedirect);
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
            res.redirect( config.passport_after.userHasEmail );
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
}