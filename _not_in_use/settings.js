// Settings for our app. The 'require' call in server.js returns
// whatever we assign to 'module.exports' in this file

module.exports = { 
  // MongoDB database settings
  db: {
    host: process.env['MONGO_NODE_DRIVER_HOST'] || '127.0.0.1',
    port: process.env['MONGO_NODE_DRIVER_PORT'] || 27017,
    name: 'LinksTo',
    short_id_length:6
  },
  // Port for the webserver to listen on
  http: {
    port: 3000
  },
  // You should use a secret of your own to authenticate session cookies
  sessionSecret: 'AlaBalaNica',
  passport_after : {
      successRedirect: '/auth-after-success',
      failureRedirect: '/',
      logoutRedirect:null,
      userHasEmail:'/coll/mine',
      afterEmailPing:'/coll/mine?emailPinged',
      afterEmailVerified:'/coll/mine'
    },
  passport:{
      google: {
          arity:3,
          icon:'google',
          require:'passport-google',
          returnURL: 'http://127.0.0.1:3000/auth/google/callback',
          realm: 'http://127.0.0.1:3000/',
          pick:[
              "id:emails.0.value",
              "user_name:emails.0.value",
              "email:emails.0.value",
              "screen_name:displayName",
              "first_name:name.givenName",
              "last_name:name.familyName"
          ]
      },
      yahoo: {
          arity:3,
          icon:'yahoo',
          require:'passport-yahoo',
          returnURL: 'http://127.0.0.1:3000/auth/yahoo/callback',
          realm: 'http://127.0.0.1:3000/',
          pick:[
              "identity:emails.0.value",
              "id:emails.0.value",
              "user_name:emails.0.value",
              "email:emails.0.value",
              "first_name:name.givenName",
              "last_name:name.familyName",
              "screen_name:displayName"
          ]
      },

      dropbox:{
          arity:4,
          icon:'dropbox',
          require:'passport-dropbox',
          consumerKey: 'ehmp71ikn0jb48b',
          consumerSecret: "98s4wr8m37krjyn",
          callbackURL: "http://127.0.0.1:3000/auth/dropbox/callback",
          pick:[
              "identity:id",
              "id",
              "email:_json.email",
              "name:_json.display_name",
              "screen_name:_json.display_name",
              "country:_json:country"
          ]
      },

      twitter:{
          arity:4,
          icon:'twitter',
          require:'passport-twitter',
          consumerKey: 'zbwCCZHWSr5vcH5eQfqKhw',
          consumerSecret: "ea5SLovCIAcd6q1HXkVTF3GWey54wR4zn4wLFHaw",
          callbackURL: "http://127.0.0.1:3000/auth/twitter/callback",
          pick:[
                "identity:id",
                "id",
                "name:_json.name",
                "screen_name:_json.screen_name",
                "user_name:_json.name",
                "location:_json.location",
                "description:_json.description",
                "time_zone:_json.time_zone",
                "lang:_json.lang",
                "profileURL:url",
                "gravatarURL:_json.profile_image_url",
                "gravatarURL_https:_json.profile_image_url_https"
            ]
      },
      facebook:{
          arity:4,
          icon:'facebook',
          require:'passport-facebook',
          clientID: '329962043758691',
          clientSecret: 'b416e871832ab4cf6c6194fca678852d',
          callbackURL: "http://127.0.0.1:3000/auth/facebook/callback",
          pick:[
              "identity:id",
              "id",
              "first_name:name.givenName",
              "last_name:name.familyName",
              "middle_name:name.middleName",
              "screen_name:displayName",
              "email:emails.0.value",
              "user_name:username",
              "gender",
              "timezone:_json.timezone",
              "locale:_json.locale",
              "profileURL:profileUrl",
              "gravatarURL:http:\/\/graph.facebook.com\/#id#\/picture",
              "gravatarURL_https:https:\/\/graph.facebook.com\/#id#\/picture",
              "gravatarURL96:http:\/\/graph.facebook.com\/#id#\/picture",
              "gravatarURL96_https:https:\/\/graph.facebook.com\/#id#\/picture"
          ]
/*
{ provider: 'facebook',
    id: '730651996',
    username: 'thomas.0007',
    displayName: 'Thomas White',
    name:
    { familyName: 'White',
        givenName: 'Thomas',
        middleName: undefined },
    gender: 'male',
        profileUrl: 'http://www.facebook.com/thomas.0007',
    emails: [ { value: undefined } ],
          _json:
          { id: '730651996',
              name: 'Thomas White',
              first_name: 'Thomas',
              last_name: 'White',
              link: 'http://www.facebook.com/thomas.0007',
              username: 'thomas.0007',
              work:
                  [ { employer: { id: '49774380515', name: 'Websense' },
                      location: { id: '115162068494946', name: 'Reading, England' },
                      position: { id: '142474002439885', name: 'Sr. Web Developer' },
                      start_date: '2010-01' },
                      { employer: { id: '113613761989029', name: 'Links To Ltd.' },
                          location: { id: '109762445708609', name: 'Bracknell' },
                          position: { id: '124442727602022', name: 'Owner' },
                          start_date: '0000-00',
                          end_date: '0000-00' } ],
              education:
                  [ { school: { id: '110400702315519', name: 'Mechanotechnicum of Pleven' },
                      year: { id: '102838599769236', name: '1979' },
                      type: 'High School' },
                      { school: { id: '105674739465906', name: 'Technical University of Varna' },
                          year: { id: '129830570392369', name: '1985' },
                          type: 'College' } ],
              gender: 'male',
              timezone: 1,
              locale: 'en_GB',
              verified: true,
              updated_time: '2012-07-29T20:31:13+0000' } }
*/


      },
      windowslive:{
          inactive:true,
          arity:4,
          icon:'windowslive',
          require:'passport-windowslive',
          clientID: '000000004C0C3804',
          clientSecret: '7KTDwioZ4OsNAb8plABbe6x19a0ioM',
          callbackURL: "http://127.0.0.1:3000/auth/windowslive/callback",
          pick:[
              "identity:id",
              "id",
              "screen_name:displayName",
              "first_name:name.givenName",
              "last_name:name.familyName",
              "middle_name:name.middleName",
              "email:emails.0.value",
              "user_name:username",
              "gender",
              "timezone:_json.timezone",
              "locale:_json.locale",
              "profileURL:profileUrl"
          ]
      },
      meetup:{
          arity:4,
          icon:'meetup',
          require:'passport-meetup',
          consumerKey: '7u9meedhtkeknea43eru6ncta3',
          consumerSecret: '7mee5ubjj19d90shirqfughohd',
          callbackURL: "http://127.0.0.1:3000/auth/meetup/callback",
          pick:[
              "identity:id",
              "id",
              "screen_name:displayName",
              "gravatarURL:_json.results.0.photo.thumb_link",
              "country:_json.results.0.country",
              "other_services:_json.results.0.other_services",
              "lon:_json.results.lon",
              "lat:_json.results.lat",
              "city:_json.results.city",
              "city:_json.results.city"
          ]
      },
      linkedin:{
          arity:4,
          icon:'linkedin',
          require:'passport-linkedin',
          consumerKey: 'mqn35l8n2clj',
          consumerSecret: 'GbPa2iIcKeRbFXVG',
          callbackURL: "http://127.0.0.1:3000/auth/linkedin/callback",
          pick:[
              "identity:id",
              "id",
              "screen_name:displayName",
              "first_name:_json.firstName",
              "last_name:name.lastName"
          ]
      }

  },

  gravatar:{ s:27, d:'mm', r:'g'},

  swig : {
      allowErrors: false,
      autoescape: true,
      cache: false,
      encoding: 'utf8',
      filters: {},
      root: __dirname + '/views',
      tags: {},
      extensions: {},
      tzOffset: 0
  },

  posters: '*@links.to',    // posters: 'tom@punkave.com',  Match anyone who works at my office


  mailer:{
        gmail:{
            service: "Gmail",
            auth: {
                user: "links.to.com@gmail.com",
                pass: "Silver+314"
            }
        }
  },

  dummy:'' // last element
};
