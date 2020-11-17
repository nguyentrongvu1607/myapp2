var mongoose = require('mongoose')
var Constant = require('../constant.js');
var { Model, Schema } = mongoose;

var ResourceModel = require('./Resources');
var LetterResourceModel = require('./LetterResource');

var QuestionType = {
    text: 1,
    audio:2,
    image:3,
    video:4,
    imageAudio:5
}

var QuestionSchema = new Schema({
    id: Number,
    textContent: String,
    resource:[{ type: Schema.Types.ObjectId, ref: 'ResourceModel' }],
    type: Number
});

QuestionSchema.pre('save', function(next) {
  var doc = this;
  
  QuestionModel.findOne({}).sort('-id').exec(function(err,  last){
      
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

class QuestionModel extends Model {
    static createQuestion( data , callback) {

        return QuestionModel.create({
            textContent: data.textContent,
            type: data.type ||QuestionType.defaultQuestion,
            resource:data.resource||[],
        },callback)
    }

    static updateQuestion( data, callback){
        return QuestionModel.findByIdAndUpdate(data._id, { $set: data }, { new: true } , callback)
    }

    static getQuestion(id , callback){
        return QuestionModel.findById(id , callback);
    }

    static getQuestions(data , callback){
        let options = {};
        options['sort'] = data.sort || { registerDate: -1 };
        if (data.limit != undefined) options['limit'] = Number(data.limit);
        if (data.page != undefined) options['page'] = Number(data.page);
        let filter = {};
        if (data.filter && Object.keys(data.filter).length > 0) {
            var fArr = [];
            Object.keys(data.filter).forEach(function (value) {
                if (QuestionSchema.paths[value]) {
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
        return QuestionModel.paginate(filter, options, callback);
    }

    static deleteQuestion(id , callback){
        return QuestionModel.findByIdAndRemove(id , callback);
    }
}


mongoose.model(QuestionModel, QuestionSchema);
module.exports = QuestionModel;
module.exports.QuestionType = QuestionType;
Constant.models['Question'] = {
    name: QuestionModel.name,
    collection: QuestionModel.collection.name
};