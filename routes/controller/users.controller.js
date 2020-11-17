
const BaseController = require('./base.controller')
const Constant = require('../../constant')
const jwt = require('jsonwebtoken')
const UserModel = require('../../database/User')
const LoginModel = require('../../database/Login')
const EventModal = require('../../database/Event')
var moment = require('moment')
var GoogleStrategy = require('passport-google-oauth').OAuthStrategy;
var Utility = require('../../utility')
var ErrorCode = require('../../error_code')
const debug = require('debug')('truck')
var moment = require('moment')
var Mongoose = require('mongoose')
const NotificationUtils = require( '../../utils/notification.utils')
class UserController extends BaseController {
    static index(req, res) {
        BaseController.generateMessage(res, 0, 1, 200)
    }

    static login(req, res) {
        debug(req.body)
        var body = req.body;
        var deviceInfo = {};
        var isWeb = 0;
        if (typeof body.loginData != 'undefined' && body.loginData.device == 0) {
            isWeb = 1;
        }


        var username = req.body.username
        username = username ? username.toLowerCase() : '';
        var password = req.body.password;
        // account info
        if (!username || !password) return BaseController.generateMessage(res, ErrorCode.MissingParams(req.body))
        // check login
        return UserModel.findOne({ $or: [{ username: username }, { email: username }, { phoneNumber: username }] }, function (error, user) {
            if (error) return BaseController.generateMessage(res, error);
            if (user == null) return BaseController.generateMessage(res, ErrorCode.UserNotFound);
            if (user.role == UserModel.getUserRole().Banned) return BaseController.generateMessage(res, ErrorCode.UserBanned);
            if (user.password != Utility.createPassword(password)) return BaseController.generateMessage(res, ErrorCode.PasswordIncorrect);
            UserController.createNewSession(req, res, user.id, { accessToken: body.accessToken, fcmToken: body.fcmToken, device: body.device, deviceId: deviceInfo.uuid })
        })
    }

    static signup(req, res) {
        debug(req.body)
        var body = req.body;

        // if (typeof req.body.deviceInfo == 'undefined' || typeof req.body.device == 'undefined') {
        //     BaseController.generateMessage(res, ErrorCode.MessageWithoutTranslation('Version app bạn sử dụng đã cũ, vui lòng cập nhật phiên bản mới'));
        //     return;
        // }
        // var deviceInfo = req.body.deviceInfo;
        // if (req.body.deviceInfo.device == 1 || req.body.deviceInfo.device == 2) {

        //     var version = Utility.getVersionApp();
        //     if (typeof deviceInfo.appVersion == 'undefined' || deviceInfo.appVersion < version.lastest_version) {
        //         BaseController.generateMessage(res, ErrorCode.MessageWithoutTranslation('Version app bạn sử dụng đã cũ, vui lòng cập nhật phiên bản mới'));
        //         return;
        //     }

        //     if (typeof deviceInfo.uuid == 'undefined' || deviceInfo.uuid.length < 2) {
        //         BaseController.generateMessage(res, ErrorCode.MessageWithoutTranslation('Không xác thực được thiết bị, vui long kiểm tra lại thiết bị hiện hành.'));
        //         return;
        //     }
        // }

        if (!body.email || body.email.indexOf('@') < 0 || body.email.indexOf('.') < 0) {
            return BaseController.generateMessage(res, ErrorCode.InvalidEmail)
        }

        if (!body.password || body.password.length < 6) {
            return BaseController.generateMessage(res, ErrorCode.InvalidPassword)
        }

        debug('signup', body);

        return UserModel.createUserWithEmail(body, function (error, user) {
            if (error) return BaseController.generateMessage(res, error);
            req.user = user;
            UserController.createNewSession(req, res, user.id, { accessToken: body.accessToken, fcmToken: body.fcmToken, device: body.device, deviceId: body.deviceInfo?body.deviceInfo.uuid:undefined });
        })
    }

    static logout(req, res, next) {
        delete req.session.token;
        BaseController.generateMessage(res, 0, new Date());
        LoginModel.findOneAndUpdate({ token: req.token }, { $set: { isExpired: 1 } }, { new: true }, function (err, login) {
            if (!err) {
                socketApi.logout(req.user, login ? login.fcmToken : ' ');
            }
        })
        req.logout();
    }

    static getMyProfile(req ,res){
        BaseController.generateMessage(res, 0 , req.user.user);
    }
    
    static createNewSession(req, res, userId, info) {
        LoginModel.initSessionFromEmail(userId, info, function (error, data) {
            if (data.fcmToken) {
                req.fcmToken = data.fcmToken;
            }
            if (req.session) {
                req.session.token = data.token;
            }

            req.login(data, function (err) {
                if (err) { };
                BaseController.generateMessage(res, error, data)
            })
        })
    }

    static checkLogin(req, res, next) {
        const token = req.headers['authorization'] || req.cookies.token || req.body.token || req.query.token // || req.headers['authorization'] || req.session.token || req.cookies.token;
        debug('token checklogin ' + token);
        LoginModel.checkToken(token, function (error, data) {
            if (error) {
                if (error == 1) {
                    BaseController.generateMessage(res, ErrorCode.UserPermissionDeny)
                } else if (error == 2) {
                    BaseController.generateMessage(res, ErrorCode.UserBanned)
                } else {
                    BaseController.generateMessage(res, error)
                }
            } else {
                req.token = token;
                req.user = data.user
                req.login = data.login
                next();
            }
        }).catch(error => {
            BaseController.generateMessage(res, error)
        })
    }

    static updateUserInfo(req, res) {
        var info = req.parsedData.userInfo;
        if (typeof info != 'undefined' && typeof info.password != 'undefined') {
            if (info.password.length > 2) {
                info.password = Utility.createPassword(info.password);
            } else {
                delete info.password
            }
        }
        UserModel.updateUserInfo(info).then(user => {
            if (user ) {
                BaseController.generateMessage(res, 0, user);
                return;
            }
            BaseController.generateMessage(res, 1);
        }).catch(err=>{
            BaseController.generateMessage(res, err);
        });
    }

    // Event

    static createEvent(req, res){
        let info = req.parsedData
        EventModal.createEvent(info).then(data=>{
            BaseController.generateMessage(res, 0 , data)
        }).catch(err=>{
            BaseController.generateMessage(res, err)
        })
    }

    static updateEvent(req, res){
        var info = req.parsedData.updateInfo;
        EventModal.updateEventInfo(info).then(data=>{
            BaseController.generateMessage(res, 0 , data)
        }).catch(err=>{
            BaseController.generateMessage(res, err)
        })
    }

    static deleteEvent(req, res){
        let eventId = req.parsedData.eventId
        EventModal.deleteEvent(eventId).then(data=>{
            BaseController.generateMessage(res, 0 , data)
        }).catch(err=>{
            BaseController.generateMessage(res, err)
        })
    }

    static getListEvent(req, res){
        let data = req.parsedData
        EventModal.getEventListByCondition(data, (err, events)=>{
            BaseController.generateMessage(res, err, events);
        })
    }
}
module.exports = UserController;