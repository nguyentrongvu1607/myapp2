var mongoose = require('mongoose')
var Constant = require('../constant.js');
var { Model, Schema } = mongoose;

var ResourceModel = require('./Resources');
var LessionPartModel = require('./LessionPart');


var TopicItemSchema = new Schema({
    id: Number,
    level:Number,
    name:String,
    tags: [String],
    dateCreated: {type:Date,default: Date.now},
    description: String,
    part: [{ type: Schema.Types.ObjectId, ref: 'LessionPartModel' }],
    language: {type:Number, default:1},
    image:{ type: Schema.Types.ObjectId, ref: 'ResourceModel' },
    flexibleId: { type: Schema.Types.ObjectId, ref: 'FlexibleModel' },
});

var populateDefault = {path:'part', populate:[
    {
        path: 'image',
        model: 'ResourceModel'
    },
    {
        path: 'audio',
        model: 'ResourceModel'
    },
    {
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
    },
    {
        path: 'flashcard',
        model: 'ContentItemModel',
        populate:[
            {
                path: 'letterResources',
                model: 'LetterResourceModel',
                populate:[
                    {
                        path: 'resources',
                        model: 'ResourceModel',
                    }
                ]
            },
            {
                path: 'resources',
                model: 'ResourceModel',
            },
        ]
    },
]}
var populateImage = {
    path: 'image',
    model: 'ResourceModel'
}

TopicItemSchema.pre('save', function(next) {
  var doc = this;
  
  TopicItemModel.findOne({}).sort('-id').exec(function(err,  last){
      
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

class TopicItemModel extends Model {
    static createTopicItem( data , callback) {

        return TopicItemModel.create({
            level:data.level,
            description: data.description || '',
            name:data.name,
            part: data.part||[],
            image:data.image
        },callback)
    }

    static updateTopicItem( data, callback){
        return TopicItemModel.findByIdAndUpdate(data._id, { $set: data }, { new: true } , callback)
    }

    static getTopicItem(id , callback){
        return TopicItemModel.findById(id , callback).populate(populateDefault).populate(populateImage);
    }

    static getTopicItems(data , callback){
        let options = {};
        options['sort'] = data.sort || { registerDate: -1 };
        if (data.limit != undefined) options['limit'] = Number(data.limit);
        if (data.page != undefined) options['page'] = Number(data.page);
        let filter = {};
        if (data.filter && Object.keys(data.filter).length > 0) {
            var fArr = [];
            Object.keys(data.filter).forEach(function (value) {
                if (TopicItemSchema.paths[value]) {
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
        options.populate = [populateDefault]
        return TopicItemModel.paginate(filter, options, callback);
    }

    static deleteTopicItem(id , callback){
        return TopicItemModel.findByIdAndRemove(id , callback);
    }
}


mongoose.model(TopicItemModel, TopicItemSchema);
module.exports = TopicItemModel;
Constant.models['TopicItem'] = {
    name: TopicItemModel.name,
    collection: TopicItemModel.collection.name
};