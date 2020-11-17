
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
    avatar: { type: String },
    about: { type: String, default: '' },
    phoneNumber: { type: String },
    age: Number,
    isActive: Number,
    status: { type: String },
    role: { type: Number, default: 2 },
    expiredAt: { type: Date, default: null },
});

UserSchema.virtual('noNeedOldPwd').get(() => {
    return !!this.googleId && !this.password
})
var mongoosePlugin = require('../utils/mongoose.util')
UserSchema.plugin(mongoosePlugin);

var PublicFields = ['username', 'fullName', 'facebookId', 'facebookName', 'firstName', 'lastName', 'birthDate', 'registerDate', 'gender', 'email', 'avatar', 'about', 'phoneNumber', 'age', 'isActive', 'role', 'status' , 'expiredAt'];
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

}

mongoose.model(UserModel, UserSchema);
module.exports = UserModel;
module.exports.PublicFields = PublicFields;
module.exports.UserRole = UserRole;
Constant.models['user'] = {
    name: UserModel.name,
    collection: UserModel.collection.name
};