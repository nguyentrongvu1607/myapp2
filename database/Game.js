var mongoose = require('mongoose')
var Constant = require('../constant.js');
var { Model, Schema } = mongoose;

var ResourceModel = require('./Resources');
var LetterResourceModel = require('./LetterResource');

var GameType = {
    defaultGame: 1
}

var GameSchema = new Schema({
    id: Number,
    content:[{ type: Schema.Types.ObjectId, ref: 'GameItemModel' }],
    type: Number,
    description: String
});
var populateDefault = {path:'content', populate:[
    {
        path: 'question',
        model: 'QuestionModel',
        populate:[{
            path: 'resource',
            model: 'ResourceModel'
        }]
    },
    {
        path: 'answerList',
        model: 'AnswerModel',
        populate:[{
            path: 'resource',
            model: 'ResourceModel'
        }]
    }
]}
GameSchema.pre('save', function(next) {
  var doc = this;
  
  GameModel.findOne({}).sort('-id').exec(function(err,  last){
      
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

class GameModel extends Model {
    static createGame( data , callback) {

        return GameModel.create({
            content: data.content||[],
            type: data.type ||GameType.defaultGame,
            description:data.description
        },callback)
    }

    static updateGame( data, callback){
        return GameModel.findByIdAndUpdate(data._id, { $set: data }, { new: true } , callback)
    }

    static getGame(id , callback){
        return GameModel.findById(id , callback).populate(populateDefault);
    }

    static getGames(data , callback){
        let options = {};
        options['sort'] = data.sort || { registerDate: -1 };
        if (data.limit != undefined) options['limit'] = Number(data.limit);
        if (data.page != undefined) options['page'] = Number(data.page);
        let filter = {};
        if (data.filter && Object.keys(data.filter).length > 0) {
            var fArr = [];
            Object.keys(data.filter).forEach(function (value) {
                if (GameSchema.paths[value]) {
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
        return GameModel.paginate(filter, options, callback)
    }

    static deleteGame(id , callback){
        return GameModel.findByIdAndRemove(id , callback);
    }
}


mongoose.model(GameModel, GameSchema);
module.exports = GameModel;
module.exports.GameType = GameType;
Constant.models['Game'] = {
    name: GameModel.name,
    collection: GameModel.collection.name
};