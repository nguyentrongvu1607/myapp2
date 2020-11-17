var JwtStrategy = require('passport-jwt').Strategy
var ExtractJwt = require('passport-jwt').ExtractJwt
var config = require('../constant')
var LoginModel = require('../database/Login');
var UserModel = require('../database/User');

const cookieExtractor = function (req) {
  var token = ExtractJwt.fromAuthHeaderAsBearerToken();
  token = token(req) || req.cookies['jwt'] || req.headers['authorization'] || req.cookies.token || req.body.token || req.query.token;
  return token;
};
module.exports = function (passport) {
  let opts = {};
  opts.jwtFromRequest = cookieExtractor;
  opts.secretOrKey = config.secretKey;
  passport.use('jwt', new JwtStrategy(opts, function (jwtPayload, done) {
    if (!jwtPayload) return done(null, false);
    console.log('passport load again');
    LoginModel.findById(jwtPayload).populate({ path: 'user' , model: UserModel.modelName, select: UserModel.PublicFields }).then(login => {
      if (!login) return done(null, false);
      return done(null, login);
    }).catch(err => {
      done(err);
    })
  }));
};
