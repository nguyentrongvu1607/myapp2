var mongoose = require('mongoose')
var Constant = require('../constant.js');
var { Model, Schema } = mongoose;

var ResourceModel = require('./Resources');
var LetterResourceModel = require('./LetterResource');

var AnswerType = {
    text: 1,
    audio:2,
    image:3,
    video:4
}

var AnswerSchema = new Schema({
    id: Number,
    textContent: String,
    resource:{ type: Schema.Types.ObjectId, ref: 'ResourceModel' },
    type: Number
});

AnswerSchema.pre('save', function(next) {
  var doc = this;
  
  AnswerModel.findOne({}).sort('-id').exec(function(err,  last){
      
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

class AnswerModel extends Model {
    static createAnswer( data , callback) {

        return AnswerModel.create({
            textContent: data.textContent,
            type: data.type ||AnswerType.text,
            resource:  ((data.resource.length > 0)?data.resource:undefined),
        },callback)
    }

    static updateAnswer( data, callback){
        return AnswerModel.findByIdAndUpdate(data._id, { $set: data }, { new: true } , callback)
    }

    static getAnswer(id , callback){
        return AnswerModel.findById(id , callback);
    }

    static getAnswers(data , callback){
        let options = {};
        options['sort'] = data.sort || { registerDate: -1 };
        if (data.limit != undefined) options['limit'] = Number(data.limit);
        if (data.page != undefined) options['page'] = Number(data.page);
        let filter = {};
        if (data.filter && Object.keys(data.filter).length > 0) {
            var fArr = [];
            Object.keys(data.filter).forEach(function (value) {
                if (AnswerSchema.paths[value]) {
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
                $or: [{ 'name': { '$regex': data.search, '$options': 'i' } },
                { 'description': { '$regex': data.search, '$options': 'i' } }
            ]
            });
        }
        options.select = PublicFields;
        return AnswerModel.paginate(filter, options, callback);
    }

    static deleteAnswer(id , callback){
        return AnswerModel.findByIdAndRemove(id , callback);
    }
}


mongoose.model(AnswerModel, AnswerSchema);
module.exports = AnswerModel;
module.exports.AnswerType = AnswerType;
Constant.models['Answer'] = {
    name: AnswerModel.name,
    collection: AnswerModel.collection.name
};