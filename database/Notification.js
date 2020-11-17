var mongoose = require('mongoose')
var Constant = require('../constant.js');
var { Model, Schema } = mongoose;
var UserModel = require('./User')
var NotificationType = {
    toUsers: 1,
    toGroup: 2, 
    toTopic: 3,
    toAll: 4
}

var NotificationSchema = new Schema({
    dateSent: {type: Date , default: Date.now} , 
    title: String ,
    text: String ,
    value: String,
    message: String , 
    fromUser: String ,
    type: {type: Number , default: NotificationType.toAll},
    toUser: {type: Schema.Types.ObjectId, ref: 'UserModel' } ,
    toGroup:  String,
    toTopic:  String,
    toAll:  String,
    listFcmToken: [String] , 
    isRead: {type: Number, default: 0},
    clickAction:String,
    contentHtml: String,
});

NotificationSchema.pre('save', function(next) {
  var doc = this;
  
  NotificationModel.findOne({}).sort('-id').exec(function(err,  last){
      
        if(doc.id > 0){
            next();
            return;
        }
        if(err || last == null){
            doc.id = 1;
        }else{
            doc.id = last.id + 1;
        }
        next();
    })
});

var PublicFields = [];

class NotificationModel extends Model {
    static createNotification( data , callback) {

        return NotificationModel.create(data ,callback)
    }

    static updateNotification( data, callback){
        return NotificationModel.findByIdAndUpdate(data._id, { $set: data }, { new: true } , callback)
    }

    static getNotification(id , callback){
        return NotificationModel.findById(id , callback);
    }

    static getNotifications(data , callback){
        let options = {};
        options['sort'] = data.sort || { dateSent: -1 };
        if (data.limit != undefined) options['limit'] = Number(data.limit);
        if (data.page != undefined) options['page'] = Number(data.page);
        let filter = {};
        if (data.filter && Object.keys(data.filter).length > 0) {
            var fArr = [];
            Object.keys(data.filter).forEach(function (value) {
                if (NotificationSchema.paths[value]) {
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
                $or: [{ 'title': { '$regex': data.search, '$options': 'i' } },
                { 'text': { '$regex': data.search, '$options': 'i' } }
            ]
            });
        }
        options.select = PublicFields;
        return NotificationModel.paginate(filter, options, callback);
    }

    static deleteNotification(id , callback){
        return NotificationModel.findByIdAndRemove(id , callback);
    }
}


mongoose.model(NotificationModel, NotificationSchema);
module.exports = NotificationModel;
module.exports.NotificationType = NotificationType;
Constant.models['Notification'] = {
    name: NotificationModel.name,
    collection: NotificationModel.collection.name
};