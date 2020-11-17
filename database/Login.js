const mongoose = require('mongoose')
const constant = require('../constant')
const UserModel = require('./User')
const UserRole = UserModel.getUserRole();
const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const moment = require('moment')
const Utility = require('../utility.js')
const debug = require('debug')(constant.debug_name)
const ErrorCode = require('../error_code')

var { Model, Schema } = mongoose;

const LoginSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'UserModel' },
  token: { type: String, unique: true },
  accessToken: { type: String },
  fcmToken: { type: String },
  timeLogin: { type: Date, default: Date.now },
  deviceId: { type: String },
  lastestTimeRequest: { type: Date, default: Date.now },
  device: { type: Number },
  isExpired: { type: Number, default: 0 },
  timeUpdateCoin: Date,
  isPendingUpdateCoin: { type: Number, default: 0 }
})

class LoginModel extends Model {
  static async initSessionFromEmail(userId, loginData, callback) {
    const newSession = new LoginModel();
    newSession.user = userId;
    newSession.token = jwt.sign(newSession._id.toString(), constant.secretKey);
    newSession.accessToken = loginData.accessToken || ' ';
    newSession.fcmToken = loginData.fcmToken || ' ';
    newSession.device = loginData.device || 3;
    newSession.deviceId = loginData.deviceId || '';
    newSession.save(function (err, data) {
      if (err) return callback(err);
      debug('session', newSession.token);
      data.populate({ path: 'user', model: 'UserModel', select: UserModel.getPublicSelect() }, callback);
    });
  }

  static initSession(facebookId, accessToken, fcmToken, device, callback) {
    const self = this;
    UserModel.findOne({ facebookId: facebookId }, function (err, user) {
      if (err) {
        debug(err.message)
        return callback(err);
      }
      if (user) { // registed
        debug('registed')
        if (user.role === UserRole.Banned) {
          return callback(ErrorCode.UserBanned)
        }
        self.createNewLoginSession(user, facebookId, accessToken, fcmToken, device, callback)
      } else { // not registed
        debug('not registed')
        callback(ErrorCode.UserNotFound)
      }
    })
  }

  static createNewLoginSession(user, facebookId, accessToken, fcmToken, device, callback) {
    LoginModel.findOne({ accessToken: accessToken }, function (err, login) {
      if (err) {
        debug(err)
        return
      }
      if (login) { // if already sign up -> login
        debug('login with old token')
        callback(null, login)
      } else { // if not login before
        debug('login with new token')
        const newSession = new LoginModel()
        newSession.user = user._id
        newSession.token = jwt.sign(newSession._id.toString(), constant.secretKey);
        newSession.accessToken = accessToken
        newSession.fcmToken = fcmToken
        newSession.device = device
        newSession.save(function (err) {
          if (err) {
            return callback(err);
          }
          callback(0, newSession)
        })
      }
    })
  }

  static async checkToken(token, callback) {
    let check = jwt.verify(token, constant.secretKey);
    if (!check) return Promise.reject(-1).asCallback(callback);

    return LoginModel.findOne({ token: token }).populate({ path: 'user', model: UserModel.modelName, select: UserModel.getPublicSelect() }).then(login => {
      if (login) {
        if (login.user.role == UserRole.Banned) {
          return Promise.reject(2); // banned
        }
        if(login.user.role == UserRole.Banned && typeof login.user.expiredAt!='undefined'){
          var isExpired = login.user.expiredAt < Date.now();
          if(isExpired){
            return Promise.reject(1); // banned
          }
        }
        
        return Promise.resolve(login);
      } else {
        return Promise.reject(1);
      }
    }).asCallback(callback);
  }

  updateLoginTime() {
    this.lastestTimeRequest = new Date()
    this.save(function (err) { debug(err) })
  }

  getYearDiff(dateFrom) {
    if (typeof dateFrom === 'undefined') {
      dateFrom = new Date()
    }
    return moment().diff(dateFrom, 'years')
  }

}
mongoose.model(LoginModel, LoginSchema)
module.exports = LoginModel;
