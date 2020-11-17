var mongoose = require('mongoose')
var Constant = require('../constant.js');
var { Model, Schema } = mongoose;

var ResourceModel = require('./Resources');
var LetterResourceModel = require('./LetterResource');

var language = {
    EnglishEnglish: 1,
    EnglishAmerican: 2,
    Chineese:3,
    Spanish:4,
    Japanese:5,
    French:6,
    VietNorth:7,
    VietSouth:8
}

var UnitSchema = new Schema({
    id: Number,
    name: String,
    description: String,
    image: { type: Schema.Types.ObjectId, ref: 'ResourceModel' },
    level:{type:Number, default:1 },
    language: {type:Number , default: language.EnglishEnglish}
});

UnitSchema.pre('save', function(next) {
  var doc = this;
  
  UnitModel.findOne({}).sort('-id').exec(function(err,  last){
      
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

class UnitModel extends Model {
    static createUnit( data , callback) {

        return UnitModel.create({
            name: data.name,
            image:  ((data.resource.length > 0)?data.resource:undefined),
            description: data.description||'',
            language: data.language
        },callback)
    }

    static updateUnit( data, callback){
        return UnitModel.findByIdAndUpdate(data._id, { $set: data }, { new: true } , callback)
    }

    static getUnit(id , callback){
        return UnitModel.findById(id , callback).populate('image').populate('outsideResource');
    }

    static getUnits(data , callback){
        let options = {};
        options['sort'] = data.sort || { registerDate: -1 };
        if (data.limit != undefined) options['limit'] = Number(data.limit);
        if (data.page != undefined) options['page'] = Number(data.page);
        let filter = {};
        if (data.filter && Object.keys(data.filter).length > 0) {
            var fArr = [];
            Object.keys(data.filter).forEach(function (value) {
                if (UnitSchema.paths[value]) {
                    let f = {};
                    if (Array.isArray(data.filter[value])) {
                        if (data.filter[value].length > 0) f[value] = { $in: data.filter[value] }
                    } else if (typeof data.filter[value] == "number") {
                        f[value] = data.filter[value];
                    } else {
                        if(UnitSchema.path(value).instance == 'ObjectID'){
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
                $or: [{ 'name': { '$regex': data.search, '$options': 'i' } },
                { 'description': { '$regex': data.search, '$options': 'i' } }
            ]
            });
        }
        options.select = PublicFields;
        return UnitModel.paginate(filter, options, callback);
    }

    static deleteUnit(id , callback){
        return UnitModel.findByIdAndRemove(id , callback);
    }
}


mongoose.model(UnitModel, UnitSchema);
module.exports = UnitModel;
module.exports.language = language;
// module.exports.UnitType = UnitType;
Constant.models['Unit'] = {
    name: UnitModel.name,
    collection: UnitModel.collection.name
};