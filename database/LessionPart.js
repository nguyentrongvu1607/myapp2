var mongoose = require('mongoose')
var Constant = require('../constant.js');
var { Model, Schema } = mongoose;

var ContentItemModel = require('./ContentItem')

var LessionPartSchema = new Schema({
    id: Number,
    topic:String,
    tags: [String],
    content:[{ type: Schema.Types.ObjectId, ref: 'ContentItemModel'} ],
    image: { type: Schema.Types.ObjectId, ref: 'ResourceModel'} ,
    flashcard: [{ type: Schema.Types.ObjectId, ref: 'ContentItemModel'}],
    game:{ type: Schema.Types.ObjectId, ref: 'GameModel'},
    audio: { type: Schema.Types.ObjectId, ref: 'ResourceModel'}
});

var populateDefault = {
    path: 'content',
    model: 'ContentItemModel',
    populate:[
        {
            path: 'letterResources',
            model: 'LetterResourceModel',
            populate:[
                {
                    path: 'resources',
                    model: 'ResourceModel',
                },
                {
                    path: 'outsideResources',
                    model: 'OutsideResourceModel',
                }
            ]
        },
        {
            path: 'resources',
            model: 'ResourceModel',
        },
        {
            path: 'outsideResources',
            model: 'OutsideResourceModel',
        },
    ]
}

var populateFlashCard = {...populateDefault};
populateFlashCard.path = 'flashcard';



LessionPartSchema.pre('save', function(next) {
  var doc = this;
  
  LessionPartModel.findOne({}).sort('-id').exec(function(err,  last){
      
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

class LessionPartModel extends Model {
    static createLessionPart( data , callback) {

        return LessionPartModel.create({
            topic: data.topic,
            content:data.content||[],
            image: data.image,
            audio : data.audio,
            tags: data.tags||[],
            flashcard: data.flashcard || [],
        },callback)
    }

    static updateLessionPart( data, callback){
        return LessionPartModel.findByIdAndUpdate(data._id, { $set: data }, { new: true } , callback)
    }

    static getLessionPart(id , callback){
        return LessionPartModel.findById(id , callback).populate(populateDefault);
    }

    static getLessionParts(data , callback){
        let options = {};
        options['sort'] = data.sort || { registerDate: -1 };
        if (data.limit != undefined) options['limit'] = Number(data.limit);
        if (data.page != undefined) options['page'] = Number(data.page);
        let filter = {};
        if (data.filter && Object.keys(data.filter).length > 0) {
            var fArr = [];
            Object.keys(data.filter).forEach(function (value) {
                if (LessionPartSchema.paths[value]) {
                    let f = {};
                    if (Array.isArray(data.filter[value])) {
                        if (data.filter[value].length > 0) f[value] = { $in: data.filter[value] }
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
                $or: [{ 'topic': { '$regex': data.search, '$options': 'i' } },
                { 'description': { '$regex': data.search, '$options': 'i' } }
            ]
            });
        }
        options.select = PublicFields;
        return LessionPartModel.paginate(filter, options, callback);
    }

    static deleteLessionPart(id , callback){
        return LessionPartModel.findByIdAndRemove(id , callback);
    }
}


mongoose.model(LessionPartModel, LessionPartSchema);
module.exports = LessionPartModel;
module.exports.populateDefault = populateDefault;
module.exports.populateFlashCard = populateFlashCard;
Constant.models['LessionPart'] = {
    name: LessionPartModel.name,
    collection: LessionPartModel.collection.name
};