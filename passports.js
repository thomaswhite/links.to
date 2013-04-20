/**
 * Created with JetBrains WebStorm.
 * User: Thomas
 * Date: 04/03/13
 * Time: 00:13
 * To change this template use File | Settings | File Templates.
 */
var debug = require('debug')('linksTo:passports');

var box = require('./box.js')
    , _ = require('lodash')
    , passport = require('passport')
    , utils = require('./tw-utils.js')
    , gravatar = require('gravatar')

    , config
    , app
    , passports

    ;

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

box.passport = passport;

function userGravatar ( User, Email, replace ){
    var settings = app.locals.config.common.gravatar;
    var settings96 = _.defaults({s:96}, settings );
    var email = User.email || Email || 'noemail@nodomain.com';

    if( replace || !User.gravatarURL  ){
        User.gravatarURL =  gravatar.url( email, settings );
    }
    if( replace || !User.gravatarURL96  ){
        User.gravatarURL96 =  gravatar.url(  email, settings96 );
    }
    if( replace || !User.gravatarURL_https  ){
        User.gravatarURL_https =  gravatar.url(  email, settings, true );
    }
    if( replace || !User.gravatarURL96_https ){
        User.gravatarURL96_https =  gravatar.url(  email, settings96, true );
    }
    return User;
}
function setPassport( settings, cb ){
    var strategy = require(settings.require).Strategy,
        pick = settings.pick,
        name = settings.name;

    function save_Picked_data( originalProfile, Profile, callback ){
        Profile.provider = name;
        Profile.type="openID";
        Profile.raw = originalProfile;
        process.nextTick(function(){
            box.waterfall('openID.authenticated', {rawOpenID:originalProfile, picked_openID: Profile }, function(err, result){
                if( err ){
                    callback(err);
                }else{
                   callback( null, userGravatar( result.user ) );
                }
            });
        });
    }
    function handleConnection_oauth2( accessToken, refreshToken, params, profile, callback ){
        if( arguments.length == 4 ){
              callback = profile;
              profile = params;
          }
        var picked  = utils.pick( profile, pick );
        picked.token = accessToken;
//        process.nextTick(function(){
            save_Picked_data( profile, picked, callback );
//        });
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
    debug("openID:%s ready", name );
    cb( null, name);
}
function ping_email ( req, res){
    if( req.user && req.body.email){
        context.db.emails.ping(req.body.email, req.user._id, req.user.active_openID,  req.user.provider, function(err, email ){
            if( err ){
                console.log(err);
            }else{
                var host = '127.0.0.1' ; // req.host;
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
};
function confirm_email ( req, res){
//  box.on('email.verified'
    context.db.emails.activate(req.params.emailID, function(err, Email){
        console.log(Email);
        context.Page2(req, res, 'user_request-email_clicked', {
            email:    Email.email,
            provider: Email.provider
        });
        // res.redirect(context.settings.passport_after.afterEmailcallback);
    });
};
function auth_after_success (req, res){
    // console.log('\n/auth-after-success', '\nUSER:', req.user );

    box.invoke('openID.afterAuth', req, function(err, Saved){
        var referer = !err && Saved ? Saved.referer : '';
        if( 1 || req.user && ( req.user.email || req.user.emailPinged )){
            app.locals.user = req.user ;
            // debug( "authenticated user: \n", app.locals.user);
            res.redirect( referer || 'http://127.0.0.1:3000/coll'  ); // config.passport_after.userHasEmail
        }else{
            delete app.locals.user;
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
    })
};
function authenticate (req, res, next ){
    box.parallel('openID.beforeAuth', req, function (err, result) {
        var dummy;
    });
    next();
};
function logout (req, res){
    var referer = req.headers.referer;
    req.logOut();
    delete app.locals.user;
    res.redirect(referer);
    return;
    if(  config.passport_after.logoutRedirect ){
        res.redirect(config.passport_after.logoutRedirect);
    }else{
        res.redirect( '/coll' );
    }
};


box.on('init', function (App, Config, done) {
    config = Config.passport;
    done(null, 'passports initiated');
});

exports.init = passports = function( App, Config, initDone ){
    app = App;
    config = Config.passport;

    app.use(passport.initialize());
    app.use(passport.session());

    box.utils.async.forEach( config.passports, setPassport, function(err, result){

        app.get('/authenticate/:provider',   authenticate );
        app.get('/logout',                   logout );
        app.get('/auth-after-success',       auth_after_success);
        app.post('/secret/ping-email',       ping_email);
        app.get('/confirm/alabala/:emailID', confirm_email);

        debug('initialised.')
        initDone(null, result);
    } );


    return true;
};
