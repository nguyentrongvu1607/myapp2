const passport = require('passport')
var Constant = require('../constant')
function setupAuthenticate(app) {
  var UserModel = require('../database/User');
  var LoginModel = require('../database/Login');

  require('./passport.config')(passport);
  app.use(passport.initialize());
  app.use(passport.session({
      secret: Constant.secretKey,
      cookie: { maxAge: 24 * 60 * 1000 },
      resave: false,
      saveUninitialized: false,
      maxAge: 24 * 60 * 1000 // 24 hours        
  }));

  passport.serializeUser(function (user, done) {
    done(null, { _id: user._id });
  });
  passport.deserializeUser(function (user, done) {
    if (!user || !user._id) return done(null, false);
    LoginModel.findById(user._id, done).populate({ path: 'user', model: UserModel.modelName, select: UserModel.getPublicSelect() })
  });
};
module.exports = setupAuthenticate  