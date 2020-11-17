var mongoose = require('mongoose')
var Constant = require('../constant.js');
var { Model, Schema } = mongoose;

var ResourceModel = require('./Resources');
var LetterResourceModel = require('./LetterResource');

var GameItemType = {
    game2answer:1,
    game3answer:2,
    game4answer:3
}

var GameItemSchema = new Schema({
    id: Number,
    isCorrectAnswer: Number,
    question: { type: Schema.Types.ObjectId, ref: 'QuestionModel' },
    answerList: [{ type: Schema.Types.ObjectId, ref: 'AnswerModel' }],
    type: Number
});

GameItemSchema.pre('save', function(next) {
  var doc = this;
  
  GameItemModel.findOne({}).sort('-id').exec(function(err,  last){
      
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

class GameItemModel extends Model {
    static createGameItem( data , callback) {

        return GameItemModel.create({
            type: data.type ||GameItemType.defaultGame,
            answerList:[],
            question:data.question ,
            isCorrectAnswer:data.isCorrectAnswer
        },callback)
    }

    static updateGameItem( data, callback){
        return GameItemModel.findByIdAndUpdate(data._id, { $set: data }, { new: true } , callback)
    }

    static getGameItem(id , callback){
        return GameItemModel.findById(id , callback);
    }

    static getGameItems(data , callback){
        let options = {};
        options['sort'] = data.sort || { registerDate: -1 };
        if (data.limit != undefined) options['limit'] = Number(data.limit);
        if (data.page != undefined) options['page'] = Number(data.page);
        let filter = {};
        if (data.filter && Object.keys(data.filter).length > 0) {
            var fArr = [];
            Object.keys(data.filter).forEach(function (value) {
                if (GameItemSchema.paths[value]) {
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
        return GameItemModel.paginate(filter, options, callback);
    }

    static deleteGameItem(id , callback){
        return GameItemModel.findByIdAndRemove(id , callback);
    }
}


mongoose.model(GameItemModel, GameItemSchema);
module.exports = GameItemModel;
module.exports.GameItemType = GameItemType;
Constant.models['GameItem'] = {
    name: GameItemModel.name,
    collection: GameItemModel.collection.name
};