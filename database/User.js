
var mongoose = require('mongoose')
var Schema = mongoose.Schema;
var Utility = require('../utility.js');
var Constant = require('../constant.js');
const debug = require('debug')(Constant.debug_name + ':UserModel');
const ErrorCode = require('../error_code');
const Promise = require('bluebird');
const path = require('path')
const jwt = require('jsonwebtoken');
const __ = require('i18n').__;
const imgControl = require('../utils/image.util')

var LocationSchema = {
    code: String,
    city: String,
    country: String,
    lat: Number,
    lng: Number
}

var oldPasswordSchema = {
    password: String,
    timeChange: { type: Date, default: Date.now }
}

var dataHistory = {
    autoNextContent: Boolean,
    currentLesson: String,
    isLearned: String,
    isLearnedUnit: String,
    preUnit: String,
    timeFlash: Number,
    unitLanguage: Number,
    preLesson: String,
    preLessonId: String,
    currentUnit: String,
    versionUpdate: Number,
}

var childData = {
    childName:String,
    childBirthDate:Date,
    childGender:{type: Number, default:0},
    avatarChild:{type: String, default:"../../assets/image/PROFILE/avt-1.svg"},
    historyLearned: dataHistory
}

var UserSchema = new Schema({
    facebookId: { type: Number },
    facebookName: { type: String },
    googleId: String,
    username: { type: String, lowercase: true, trim: true },
    fullName: String,
    firstName: String,
    lastName: String,
    birthDate: Date,
    registerDate: { type: Date, default: Date.now },
    gender: { type: Number, default: 0 },
    email: {
        type: String,
        lowercase: true,
        trim: true
    },
    password: { type: String },
    pwdForgot: { type: String },
    oldPassword: [oldPasswordSchema],
    avatar: { type: String },
    profilePicture: [String],
    about: { type: String, default: '' },
    phoneNumber: { type: String },
    age: Number,
    location: LocationSchema,
    isActive: Number,
    status: { type: String },
    isUpdateFirstTimeProfile: { type: Boolean, default: true },
    role: { type: Number, default: 2 },
    expiredAt: { type: Date, default: null },
    balance: { type: Number, default: 0 },
    listChild: [ childData ]
});

UserSchema.virtual('noNeedOldPwd').get(() => {
    return !!this.googleId && !this.password
})
var mongoosePlugin = require('../utils/mongoose.util')
UserSchema.plugin(mongoosePlugin);

var PublicFields = ['username', 'avatarChild', 'listChild', 'childName', 'fullName', 'childGender', 'childBirthDate','facebookId', 'facebookName', 'firstName', 'lastName', 'birthDate', 'registerDate', 'gender', 'email', 'avatar', 'profilePicture', 'about', 'phoneNumber', 'age', 'isActive', 'role', 'status' , 'expiredAt'];
var UserRole = {
    Super_Admin: 999,
    Admin: 998,
    Moderator: 900,
    Manager:100,
    Teacher:10,
    PremiumUser: 3,
    Member: 2,
    Banned: 1
}

class UserModel extends mongoose.Model {
    static getPublicFields() {
        return PublicFields;
    }

    static getPublicSelect() {
        return PublicFields.join(' ');
    }

    static getUserRole() {
        return UserRole;
    }

    static getRoles(){
        return Promise.resolve(UserRole)
    }

    static async createUserWithEmail(info, callback) {
        if (typeof info == 'undefined' || typeof info.email == 'undefined' || typeof info.password == 'undefined') {
            return Promise.reject(ErrorCode.MissingParams(info)).asCallback(callback);
        }

        if (info.id || info._id) {
            info._id = info._id || info.id;
            let valid = await UserModel.isObjectId(info.id);
            if (!valid) delete info._id;
        } else {
            delete info._id;
        }
        delete info.id;

        if (!info.email || !/^([\w-\.]+@([\w-]+\.)+[\w-]{2,})?$/.test(info.email)) {
            return Promise.reject(ErrorCode.InvalidEmail).asCallback(callback);
        }

        // delete info.username;
        return UserModel.findOne({ email: info.email }).then(checkUser => {
            if (checkUser == null) {
                // create user
                info.password = Utility.createPassword(info.password);
                return UserModel.create(info)
            } else {
                return Promise.reject(ErrorCode.EmailInUse);
            }
        }).asCallback(callback);
    }

    static createUserWithGoole(info, callback) {
        if (!info || !info.googleId || !info.email || !info.lastName || !info.firstName) return Promise.reject(ErrorCode.MissingParams(info)).asCallback(callback);
        if (!info.email || !/^([\w-\.]+@([\w-]+\.)+[\w-]{2,})?$/.test(info.email)) {
            return Promise.reject(ErrorCode.InvalidEmail).asCallback(callback);
        }
        delete info.username;
        return UserModel.findOne({ googleId: info.googleId }).then(user => {
            if (user == null) {
                return UserModel.create(info);
            } else {
                if (user.role == UserRole.Banned) return Promise.reject(ErrorCode.UserBanned);
                return user;
            }
        }).asCallback(callback);
    }

    static getUserInfo(id, callback) {
        return UserModel.findById(id, PublicFields, callback);
    }

    static getUserListByCondition(data, callback) {
        let options = {};
        options['sort'] = data.sort || { registerDate: -1 };
        if (data.limit != undefined) options['limit'] = Number(data.limit);
        if (data.page != undefined) options['page'] = Number(data.page);
        let filter = {};
        if (data.filter && Object.keys(data.filter).length > 0) {
            var fArr = [];
            Object.keys(data.filter).forEach(function (value) {
                if (UserSchema.paths[value]) {
                    let f = {};
                    if (Array.isArray(data.filter[value])) {
                        if (data.filter[value].length > 0) f[value] = { $in: data.filter[value] }
                    } else if (typeof data.filter[value] == "number") {
                        f[value] = data.filter[value];
                    } else {
                        f[value] = new RegExp(data.filter[value], 'ig');
                    }

                    if (Object.keys(f).length) fArr.push(f);
                }
            });
            if (fArr.length > 0) filter['$and'] = fArr;
        }
        if (data.search && typeof (data.search) == 'string' && data.search.length) {
            if (!filter['$and']) filter['$and'] = [];
            filter.$and.push({
                $or: [{ 'facebookName': { '$regex': data.search, '$options': 'i' } },
                { 'fullName': { '$regex': data.search, '$options': 'i' } },
                { 'firstName': { '$regex': data.search, '$options': 'i' } },
                { 'lastName': { '$regex': data.search, '$options': 'i' } },
                { 'phoneNumber': { '$regex': data.search, '$options': 'i' } },
                { 'email': { '$regex': data.search, '$options': 'i' } },
                { 'about': { '$regex': data.search, '$options': 'i' } },
                { 'username': { '$regex': data.search, '$options': 'i' } }]
            });
        }
        options.select = PublicFields;
        return UserModel.paginate(filter, options, callback);
    }

    static getUserInfoByList(userIds, callback) {
        return UserModel.find({ _id: { $in: userIds } }, PublicFields, callback);
    }


    static updateUserInfoBySelf(info, callback) {
        return this.updateUserInfo(info, callback);
    }

    static async updateUserInfo(newInfo, callback) {
        if (!newInfo || !newInfo._id) return Promise.reject(ErrorCode.MissingParams(newInfo)).asCallback(callback);
        var roleChanged = false;
        // delete newInfo.password;
        return this.findById(newInfo._id).then(oldUser => {
            if (!oldUser) return Promise.reject(ErrorCode.UserNotFound);

            let promise = Promise.resolve(false);
            if (newInfo.avatar && /^(tmp\/)/i.test(newInfo.avatar)) {
                var oldPath = Constant.uploads_folder + newInfo.avatar;
                // var newPath = Constant.uploads_folder + newInfo._id + '/' + newInfo.avatar.split('/')[1];
                oldPath = path.normalize(oldPath);
                promise = imgControl.move(oldPath, Constant.uploads_folder, newInfo._id.toString() + '/' + Date.now() + '.jpg');
            }
            roleChanged = newInfo.role != undefined && oldUser.role != newInfo.role;
            return promise;
        }).then(pathImg => {
            if (pathImg) newInfo.avatar = pathImg;
            return UserModel.findByIdAndUpdate(newInfo._id, { $set: newInfo }, { new: true }).then(user => {
                user._doc.roleChanged = roleChanged;
                return user;
            })
        }).asCallback(callback);


        // if (newInfo && typeof newInfo.profilePicture != 'undefined' && newInfo.profilePicture.length > 0) {
        //     newInfo.avatar = newInfo.profilePicture[0];
        // } else {
        //     delete newInfo.profilePicture;
        // }
    }

    static changePassword(userId, passInfo, callback) {
        // if (!passInfo.password_old) return Promise.reject(ErrorCode.PasswordIncorrect).asCallback(callback);
        if (!passInfo.password_new) return Promise.reject(ErrorCode.PasswordNewMissing).asCallback(callback);

        return UserModel.findById(userId).then(user => {
            if (!user) return Promise.reject(ErrorCode.UserNotFound);
            if (user.noNeedOldPwd) {
                user.password = Utility.createPassword(passInfo.password_new);
            } else {
                if (!passInfo.password_old) return Promise.reject(ErrorCode.PasswordIncorrect).asCallback(callback);
                passInfo.password_old = Utility.createPassword(passInfo.password_old);
                if (passInfo.password_old != user.password) {
                    return Promise.reject(ErrorCode.PasswordIncorrect);
                }
                user.oldPassword.push({ password: passInfo.password_old })
            }
            return user.save();
        }).asCallback(callback);
    }

    static checkPermissionEvent(userId, ownerId, callback) {
        debug('canCreatedEvent', 'check permission isOwner ', userId, ownerId)
        if (ownerId == userId) {
            return UserModel.isObjectId(ownerId).then(valid => {
                if (valid) {
                    return UserModel.findById(ownerId).then(user => {
                        debug('canCreatedEvent', user);
                        if (user && user.role >= UserRole.Merchant) return Promise.resolve(true);
                        return Promise.resolve(false);
                    })
                }

                return Promise.reject(ErrorCode.InvalidId);
            }).asCallback(callback);
        } else {
            return UserModel.isObjectId(userId).then(valid => {
                if (valid) {
                    return UserModel.findById(userId).then(user => {
                        if (user && user.role > UserRole.Merchant) return Promise.resolve(true);
                        return Promise.resolve(false);
                    })
                }

                return Promise.reject(ErrorCode.InvalidId);
            }).asCallback(callback);
        }
    }

    static deleteUser(userId, callback) {
        return UserModel.findByIdAndUpdate(userId, { $set: { role: UserRole.Banned } }, callback);
    }

    static changePasswordReset(token, newPwd, callback) {
        return new Promise((resolve, reject) => {
            var payload = jwt.verify(token, Constant.SecrectKey);
            if (!payload) return reject(ErrorCode.ForgotPwdTokenInvalid);
            if (payload.time < new Date().getTime()) return reject(ErrorCode.ForgotPwdTokenExpired);
            UserModel.findById(payload.user).then(user => {
                if (user && user.pwdForgot == token) return resolve(user);
                reject(ErrorCode.ForgotPwdHadChanged)
            }).catch(err => {
                reject(err);
            })
        }).then(user => {
            user.oldPassword.push({ password: user.password })
            user.password = Utility.createPassword(newPwd);
            user.pwdForgot = null;
            return user.save();
        }).asCallback(callback);
    }

    static checkTokenChangePwd(token, callback) {
        return new Promise((resolve, reject) => {
            var payload = jwt.verify(token, Constant.SecrectKey);
            if (!payload) return reject(ErrorCode.ForgotPwdTokenInvalid);
            if (payload.time < new Date().getTime()) return reject(ErrorCode.ForgotPwdTokenExpired);
            UserModel.findById(payload.user).then(user => {
                if (user && user.pwdForgot == token) return resolve(user);
                reject(ErrorCode.ForgotPwdHadChanged)
            }).catch(err => {
                reject(err);
            })
        }).asCallback(callback);
    }

    static submitPayment(info, callback) {
        return this.findByIdAndUpdate(info.user, { $set: { role: UserRole.PremiumUser } }, { new: true }, callback)
    }

    static convertMoneyToDays(money) {
        if(money == 299*1000){
            return 6*30
        }else if(money == 599*1000 ){
            return 12*30
        }else if(money == 2999*1000){
            return 50*12*30
        }else{
            return 0;
        }
    }
}

mongoose.model(UserModel, UserSchema);
module.exports = UserModel;
module.exports.PublicFields = PublicFields;
module.exports.UserRole = UserRole;
Constant.models['user'] = {
    name: UserModel.name,
    collection: UserModel.collection.name
};