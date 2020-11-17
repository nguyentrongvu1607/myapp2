var mongoose = require('mongoose')
var Constant = require('../constant.js');
var { Model, Schema } = mongoose;



var SettingSchema = new Schema({
    id: Number,
    key: String,
    displayName:String,
    value: String,
    description: String,
    isObject:{type:Number,default:0},
    collapseKey: String,
});

SettingSchema.pre('save', function(next) {
  var doc = this;
  
  SettingModel.findOne({}).sort('-id').exec(function(err,  last){
      
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

class SettingModel extends Model {
    static createSetting( data , callback) {
        if(typeof data.value == 'Object' || typeof data.value == 'object'){
            data.value = JSON.stringify(data.value)
            data.isObject = true;
        }
        return SettingModel.create({
            key: data.key,
            value: '' + data.value,
            description:data.description,
            displayName: data.displayName,
        },callback)
    }

    static updateSetting( data, callback){
        return SettingModel.findByIdAndUpdate(data._id, { $set: data }, { new: true } , callback)
    }

    static getSetting(id , callback){
        return SettingModel.findById(id , callback).populate('image').populate('outsideResource');
    }

    static getSettings(data , callback){
        let options = {};
        options['sort'] = data.sort || { registerDate: -1 };
        if (data.limit != undefined) options['limit'] = Number(data.limit);
        if (data.page != undefined) options['page'] = Number(data.page);
        let filter = {};
        if (data.filter && Object.keys(data.filter).length > 0) {
            var fArr = [];
            Object.keys(data.filter).forEach(function (value) {
                if (SettingSchema.paths[value]) {
                    let f = {};
                    if (Array.isArray(data.filter[value])) {
                        if (data.filter[value].length > 0) f[value] = { $in: data.filter[value] }
                    } else if (typeof data.filter[value] == "number") {
                        f[value] = data.filter[value];
                    } else {
                        if(SettingSchema.path(value).instance == 'ObjectID'){
                            f[value] = data.filter[value]
                        }else{
                            f[value] = new RegExp(data.filter[value], 'ig');
                        }                        
                    }

                    if (Object.keys(f).length) fArr.push(f);
                }
            });
            if (fArr.length > 0) filter['$and'] = fArr;
        }
        if (data.search && typeof (data.search) == 'string' && data.search.length) {
            if (!filter['$and']) filter['$and'] = [];
            filter.$and.push({
                $or: [{ 'key': { '$regex': data.search, '$options': 'i' } },
                { 'description': { '$regex': data.search, '$options': 'i' } }
            ]
            });
        }
        options.select = PublicFields;
        return SettingModel.paginate(filter, options, callback);
    }

    static deleteSetting(id , callback){
        return SettingModel.findByIdAndRemove(id , callback);
    }
}


mongoose.model(SettingModel, SettingSchema);
module.exports = SettingModel;
// module.exports.SettingType = SettingType;
Constant.models['Setting'] = {
    name: SettingModel.name,
    collection: SettingModel.collection.name
};