
const BaseController = require('./base.controller')
const Constant = require('../../constant')
const jwt = require('jsonwebtoken')
const UserModel = require('../../database/User')
const LoginModel = require('../../database/Login')
const TransactionModel = require('../../database/Transaction')
const TransactionCodeModel = require('../../database/TransactionCode')
var moment = require('moment')
const NotificationModel = require('../../database/Notification')
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

    static signupWithPhone(req, res ){
        let body = req.body
        if (!body.phoneNumber) {
            return BaseController.generateMessage(res, ErrorCode.InvalidEmail)
        }

        if (!body.password || body.password.length < 6) {
            return BaseController.generateMessage(res, ErrorCode.InvalidPassword)
        }

        debug('signup', body);
        return UserModel.findOne({phoneNumber: body.phoneNumber }).then(userExist=>{
            if(userExist== null){
                return UserModel.create({phoneNumber: body.phoneNumber , password: Utility.createPassword(body.password)}, function (error, user) {
                    if (error) return BaseController.generateMessage(res, error);
                    req.user = user;
                    UserController.createNewSession(req, res, user.id, { accessToken: body.accessToken, fcmToken: body.fcmToken, device: body.device, deviceId: body.deviceInfo?body.deviceInfo.uuid:undefined });
                })
            }else{
                return BaseController.generateMessage(res, ErrorCode.InvalidEmail)
            }
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

    static loginGoogleWithAccessToken(req, res) {
        var body = req.body;
        let accessToken = body.accessToken;
        if (!accessToken) return BaseController.generateMessage(res, ErrorCode.MissingParams({ message: 'access token required', field: 'accessToken' }));
        let StrategyGg = new GoogleStrategy({
            clientID: Constant.GOOGLE_CLIENT_ID,
            clientSecret: Constant.GOOGLE_CLIENT_SERECT
        }, () => { })
        StrategyGg.userProfile(accessToken, (err, profile) => {
            if (err) return BaseController.generateMessage(res, err);
            let user = {
                email: profile.emails.length && profile.emails[0].value,
                firstName: profile.name.givenName,
                lastName: profile.name.familyName,
                fullName: profile.displayName,
                googleId: profile.id,
                gender: profile.gender == 'male' ? 1 : 0
            }

            let promiseAvatar = Promise.resolve(false);
            if (profile.photos) {
                let pathAvatarTmp = path.normalize(Constant.uploadFolder + 'tmp/' + Date.now() + '.jpg');
                promiseAvatar = download(profile.photos[0].value + '0', pathAvatarTmp);
            }


            promiseAvatar.catch((e) => {
                debug(e);
            }).then(imgPath => {
                UserModel.createUserWithGoole(user).then(async done => {
                    if (!done.avatar && imgPath) {
                        done.avatar = await ImageController.move(imgPath, Constant.uploads_folder, done.id.toString() + '/' + Date.now() + '.jpg');
                        done.save();
                    }
                    req.user = done;
                    UserController.createNewSession(req, res, done.id, { accessToken: body.accessToken, fcmToken: body.fcm_token, device: body.device });
                }).catch(err => {
                    BaseController.generateMessage(res, err);
                })
            })
        })
    }

    static signupWithGoogle(req, res) {
        var body = req.body;

        if (!body.firstName || !body.lastName) {
            return BaseController.generateMessage(res, ErrorCode.InvalidUsername)
        }

        if (!body.email || body.email.indexOf('@') < 0 || body.email.indexOf('.') < 0) {
            return BaseController.generateMessage(res, ErrorCode.InvalidEmail)
        }

        return UserModel.createUserWithGoole(body).then(user => {
            req.user = user;
            UserController.createNewSession(req, res, user.id, { accessToken: body.accessToken, fcmToken: body.fcm_token, device: body.device });
        }).catch(err => {
            BaseController.generateMessage(res, err);
        })
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

    static defaultJson() {
        return { success: 0, data: { code: '000', message: 'Request invalid.' } }
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

    static checkDeviceCanRegister(req, res) {
        LoginModel.aggregate([
            { "$match": { "deviceId": req.body.deviceId } },
            {
                "$group": {
                    "_id": "$user"
                }
            }
        ]).then(listUser => {
            var count = listUser == null ? 0 : listUser.length;
            if (count == null || count < 2) {
                BaseController.generateMessage(res, null, 1);
            } else {
                BaseController.generateMessage(res, null, ErrorCode.MissingParams('Thiết bị này đã đăng ký quá nhiều'));
            }
        });
    }

    static forgotPassRequest(req, res) {
        let email = req.body.email;
        if (!email) return BaseController.generateMessage(res, ErrorCode.ForgotPwdEmailRequired);
        UserModel.findOne({ email: email }).then(async (user) => {
            if (!user) return BaseController.generateMessage(res, ErrorCode.UserNotFound);
            let time = new Date();
            time.setDate(time.getDate() + 1);
            let token = {
                time: time.getTime(),
                pre: '_',
                user: user.id
            }
            token = jwt.sign(token, Constant.SecrectKey);
            user.pwdForgot = token;
            await user.save();
            var resetInfo = {
                username: user.fullName,
                resetLink: Constant.base_url + `${ApiList.pwd_reset_url}/` + user.pwdForgot,
                email: user.email
            }
            return MailCtr.sendEmailResetPassword(resetInfo);
        }).then(send => {
            BaseController.generateMessage(res, null, { success: true, message: __('RequestResetPwdSuccess') })
        }).catch(err => {
            BaseController.generateMessage(res, err)
        })
    }

    static changePassword(req, res) {
        UserModel.changePasswordReset(req.body.token, req.body.password).then(() => {
            BaseController.generateMessage(res, null, { message: __('ChangePwdSuccess') });
        }).catch(err => {
            BaseController.generateMessage(res, err);
        })
    }

    static checkTokenResetPwd(req, res) {
        UserModel.checkTokenChangePwd(req.params.token).then(ok => {
            BaseController.generateMessage(res, null, {});
        }).catch(err => {
            BaseController.generateMessage(res, err);
        })
    }

    static getListUser(req, res) {
        var info = req.parsedData;
        UserModel.getUserListByCondition(info, function (err, users) {
            BaseController.generateMessage(res, err, users);
        });
    }

    static getUserById(req, res) {
        var info = req.parsedData.info;
        UserModel.getUserInfo(info._id, function (err, user) {
            BaseController.generateMessage(res, err, user);
        });
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

    static addNewUser(req, res){
        var info = req.parsedData.userInfo;
        UserModel.createUserWithEmail(info, function(err, user){
            BaseController.generateMessage(res, err, user);
        });
    }

    static getUserRole(req, res){
        UserModel.getRoles().then(roles=>{
            BaseController.generateMessage(res, 0, roles)
        })
    }

    static checkUserExist(req, res){
        UserModel.getUserListByCondition(req.parsedData, function (err, users) {
            BaseController.generateMessage(res, err, users);
        });
    }

    static createTransactionCode(req, res){
        TransactionCodeModel.createTransactionCode({}).then(code=>{
            BaseController.generateMessage(res, 0, code);
        }).catch(err=>{
            BaseController.generateMessage(res, err);
        })
    }

    static updateTransactionCode(req,res){
        req.parsedData._id = req.parsedData.transactionCodeId;
        TransactionCodeModel.updateTransactionCode(req.parsedData).then(result=>{
            BaseController.generateMessage(res, 0, result)
        }).catch(err=>{
            BaseController.generateMessage(res, err)  
        })
    }

    static getListTransactionCode(req,res){
        TransactionCodeModel.getTransactionCodes(req.parsedData).then(result=>{
            BaseController.generateMessage(res, 0, result)
        }).catch(err=>{
            BaseController.generateMessage(res, err)  
        })
    }

    static deleteTransactionCode(req,res){
        TransactionCodeModel.deleteTransactionCode(req.parsedData.transactionCodeId).then(result=>{
            BaseController.generateMessage(res, 0, result)
        }).catch(err=>{
            BaseController.generateMessage(res, err)  
        })
    }

    static createTransaction(req, res){
        if(typeof req.parsedData.createdBy == 'undefined'){
            req.parsedData.createdBy = req.user.user._id.toString();
        }
        if(typeof req.parsedData.toUser == 'undefined'){
            req.parsedData.toUser = req.user.user._id.toString();
        }
        TransactionModel.createTransaction(req.parsedData).then(result=>{
            BaseController.generateMessage(res, 0, result)
        }).catch(err=>{
            BaseController.generateMessage(res, err)  
        })
        
    }

    static getListTransaction(req,res){
        TransactionModel.getTransactions(req.parsedData).then(result=>{
            BaseController.generateMessage(res, 0, result)
        }).catch(err=>{
            BaseController.generateMessage(res, err)  
        })
    }

    static getTransactionDetail(req,res){
        TransactionModel.getTransaction(req.parsedData.transactionId).then(result=>{
            BaseController.generateMessage(res, 0, result)
        }).catch(err=>{
            BaseController.generateMessage(res, err)  
        })
    }


    static enterCodeForTransaction(req,res){
        var today = moment();
        var code = req.parsedData.code;
        var user = req.user.user;
        TransactionCodeModel.getTransactionCodeByValue({code:code}).then(code=>{
            if(code == null || code.applyTimes <1){
                BaseController.generateMessage(res, 'invalid code')  
                return;
            }
            var newTransactionData = {
                toUser: user._id,
                method: TransactionModel.TransactionMethod.code,
                status: TransactionModel.TransactionStatus.success,
                money: code.money
            }
            TransactionModel.createTransaction(newTransactionData).then(result=>{
                var dateExpired = moment(today).add(UserModel.convertMoneyToDays(code.money), 'days');
                
                if(user.role < UserModel.UserRole.PremiumUser){
                    user.expiredAt = dateExpired
                    user.role = UserModel.UserRole.PremiumUser;
                    user.save();
                }                
                
                code.applyTimes--;
                code.save();
                BaseController.generateMessage(res, 0, result);
            }).catch(err=>{
                BaseController.generateMessage(res, err)  
            })
        }).catch(err=>{
            BaseController.generateMessage(res, err)  
        })
    }

    static getUserTransactionHistory(req, res){
        var userId = req.user.user._id;
        if(typeof req.parsedData.userId != 'undefined'){
            userId = Mongoose.Types.ObjectId(req.parsedData.userId );
        }
        TransactionModel.getTransactionFromUser(userId).then(result=>{
            BaseController.generateMessage(res, 0 , result)  
        }).catch(err=>{
            BaseController.generateMessage(res, err)  
        })
    }

    static updateLoginData(req, res){
        var loginData = req.parsedData.loginData;
        var token  = req.user.token;
        LoginModel.updateOne({token:token}, { $set: loginData }, { new: true } ).then(result=>{
            BaseController.generateMessage(res, 0 , result)  
        }).catch(err=>{
            BaseController.generateMessage(res, err)  
        })
    }

    static sendNotificationFromAdminbackend(req, res){
        var type = req.parsedData.type;
        var userIds = req.parsedData.userIds;//[];
        var roles = req.parsedData.roles;//[];
        var contentHtml = req.parsedData.contentHtml;
        var message = req.parsedData.message;
        var title = req.parsedData.title;
        var click_action = req.parsedData.click_action;
        var topicName = req.parsedData.topicName
        if(type == NotificationUtils.NotificationType.TYPE_REG_ID){
            LoginModel.getFcmTokenFromUserIds(userIds).then(listToken=>{
                console.log('list token ' + listToken);
                
                let notificationData = NotificationUtils.generateDataMess(Constant.FCM_KEY , type , 1 , listToken , title , contentHtml , message , click_action  );
                NotificationUtils.sendNotification(notificationData);
                let listNotificationPushed = []
                for(var i= 0 ; i < userIds.length ; i++){
                    // title: String ,
                    // text: String ,
                    // value: String,
                    // message: String , 
                    // fromUser: String ,
                    // type: {type: Number , default: NotificationType.toAll},
                    // toUser: {type: Schema.Types.ObjectId, ref: 'UserModel' } ,
                    // toGroup:  {type: Number , default: 0},
                    // toTopic:  {type: Number , default: 0},
                    // toAll:  {type: Number , default: 0},
                    // listFcmToken: [String] , 
                    // isRead: {type: Number, default: 0}
                    // click_action
                    listNotificationPushed.push({
                        title:title,
                        message: message,
                        type:type,
                        contentHtml:contentHtml,
                        fromUser: req.user._id,
                        toUser: userIds[i],
                        clickAction: click_action
                    })
                }
                NotificationModel.create(listNotificationPushed).then(listPushed=>{
                    BaseController.generateMessage(res, !listPushed, listPushed.length)  ;
                }).catch(err=>{
                    BaseController.generateMessage(res, err)  ;
                });
            }).catch(err=>{
                BaseController.generateMessage(res, err)  ;
            })
        }else if(type == NotificationUtils.NotificationType.TYPE_CHANNEL){
            let notificationData = NotificationUtils.generateDataMess(Constant.FCM_KEY , type , 1 , topicName , title , contentHtml , message , click_action );
            NotificationUtils.sendNotification(notificationData);
            NotificationModel.create({
                title:title,
                message: message,
                type:type,
                contentHtml:contentHtml,
                fromUser: req.user._id,
                clickAction: click_action,
                toTopic: topicName
            }).then(listPushed=>{
                BaseController.generateMessage(res, !listPushed, listPushed)  ;
            }).catch(err=>{
                BaseController.generateMessage(res, err)  ;
            });
        }else if(type == NotificationUtils.NotificationType.TYPE_ALL ){
            let notificationData = NotificationUtils.generateDataMess(Constant.FCM_KEY , type , 1 , topicName , title , contentHtml , message , click_action );
            NotificationUtils.sendNotification(notificationData);
            NotificationModel.create({
                title:title,
                message: message,
                type:type,
                contentHtml:contentHtml,
                fromUser: req.user._id,
                clickAction: click_action,
                toTopic: topicName
            }).then(listPushed=>{
                BaseController.generateMessage(res, !listPushed, listPushed)  ;
            }).catch(err=>{
                BaseController.generateMessage(res, err)  ;
            });
        }else{
            BaseController.generateMessage(res, new Error('Not correct fomat data'))  ;
        }
        
        
    }

    static getUserNotifications(req, res){
        var data = req.parsedData;
        var topicName='';
        if(typeof data.topicName!='undefined'){
            topicName = data.topicName
        }
        data.filter = {
            $or:[
                {toUser: req.user._id},
                {type: NotificationUtils.NotificationType.TYPE_ALL},
                {type: NotificationUtils.NotificationType.TYPE_CHANNEL , topicName:topicName},
            ]

        }
        // if(typeof data.filter != 'undefined'){
        //     data.filter.fromUser = req.user._id;
        // }else{
        //     data.filter = {
        //         fromUser: req.user._id
        //     }
        // }
        NotificationModel.getNotifications(data).then(notifications=>{
            BaseController.generateMessage(res, !notifications, notifications)  ;
        }).catch(err=>{
            BaseController.generateMessage(res, new Error('Not correct fomat data'))  ;
        })
    }

    // Statistical

    static getListUserMonthly(req, res)
    {
        let year = new Date().getFullYear()
        UserModel.aggregate([ { $match:{ registerDate: { $gte: new Date(year +'-01-01'), $lte: new Date(year +'-12-31') } } },
        {$group: {
            _id:{ $month:{
                date:'$registerDate'
            }},
            total :{$sum : 1}
        }},
        {$sort:{
            _id:1
        }}
        ]).then(user=>{
            BaseController.generateMessage(res, 0, user);
        }).catch(err=>{
            BaseController.generateMessage(res, err);
        })
      
    }

    static getListActiveUserDaily(req, res)
    {
        let year = new Date().getFullYear()
        TransactionModel.aggregate([
            {
                $match: { dateCreated: { $gte: new Date(year +'-01-01'), $lte: new Date(year +'-12-31') } }
            },
            {$group: {
                _id:{ $month:{
                    date:'$dateCreated'
                }},
                total :{$sum : 1}
            }},
            {$sort:{
                _id:1
            }}
        ]).then(data=>{
            BaseController.generateMessage(res, 0, data);
        }).catch(err=>{
            BaseController.generateMessage(res, err);
        })
    }
    
}
module.exports = UserController;