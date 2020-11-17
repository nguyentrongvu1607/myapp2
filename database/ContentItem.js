var mongoose = require('mongoose')
var Constant = require('../constant.js');
var { Model, Schema } = mongoose;

var ResourceModel = require('./Resources');
var LetterResourceModel = require('./LetterResource');
var OutsideResourceModel = require('./OutsideResource')
var ContentItemType = {
    letter:1,
    sentence:2,
    multiItem: 3,
}

// content Position
// 1 nằm trên
// 2 nằm dưới
// 3 nằm trong
// 4 chữ ẩn
// 5 ảnh ẩn


//animation Content
// 1 nhấp nháy
// 2 face in

//position finger
// 1 dưới
// 2 trái
// 3 phải
// 4 cả 3

var ContentItemSchema = new Schema({
    id: Number,
    content:String,
    language: {type:Number, default:1},
    sizeContent:{type:Number, default:10},
    colorContent:{type:String, default:"#FF0000"},
    contentPosition: {type:Number, default:4},
    animationContent:{type:Number, default:1},
    type:Number,
    isShowFinger:{type:Boolean, default:false},
    positionFinger:{type:Number, default:1},
    tags: [String],
    highlight:[String],
    highlightColor:{ type: String, default: "#FCF54C" },
    resources: [{ type: Schema.Types.ObjectId, ref: 'ResourceModel' }],
    letterResources:[{ type: Schema.Types.ObjectId, ref: 'LetterResourceModel' }],
    outsideResources :[{ type: Schema.Types.ObjectId, ref: 'OutsideResourceModel' }],
    timeFrame: String,
});

var populateLetter = {
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
}

ContentItemSchema.pre('save', function(next) {
  var doc = this;
  
  ContentItemModel.findOne({}).sort('-id').exec(function(err,  last){
      
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

class ContentItemModel extends Model {
    static createContentItem( data , callback) {
        return ContentItemModel.create({
            sizeContent:data.sizeContent,
            content: data.content,
            tags: data.tags||[],
            animationContent: data.animationContent,
            positionFinger:data.positionFinger,
            isShowFinger:data.isShowFinger,
            contentPosition:data.contentPosition,
            type: data.type ||ContentItemType.letter,
            resources: data.resources||[],
            letterResources: data.letterResources||[],
            highlight:data.highlight||[],
            highlightColor:data.highlightColor,
            outsideResources: data.outsideResources||[],
            timeFrame: data.timeFrame || '',
            language: data.language
        },callback)
    }

    static updateContentItem( data, callback){
        return ContentItemModel.findByIdAndUpdate(data._id, { $set: data }, { new: true } , callback)
    }

    static getContentItem(id , callback){
        return ContentItemModel.findById(id , callback).populate(populateLetter).populate('resources').populate('outsideResources');
    }

    static getContentItems(data , callback){
        let options = {};
        options['sort'] = data.sort || { registerDate: -1 };
        if (data.limit != undefined) options['limit'] = Number(data.limit);
        if (data.page != undefined) options['page'] = Number(data.page);
        let filter = {};
        if (data.filter && Object.keys(data.filter).length > 0) {
            var fArr = [];
            Object.keys(data.filter).forEach(function (value) {
                if (ContentItemSchema.paths[value]) {
                    let f = {};
                    if (Array.isArray(data.filter[value])) {
                        if (data.filter[value].length > 0) f[value] = { $in: data.filter[value] }
                    } else if (typeof data.filter[value] == "number") {
                        f[value] = data.filter[value];
                    } else {
                        if(ContentItemSchema.path(value).instance == 'ObjectID'){
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
                $or: [{ 'content': { '$regex': data.search, '$options': 'i' } },
                { 'description': { '$regex': data.search, '$options': 'i' } }
            ]
            });
        }
        options.select = PublicFields;
        options.populate = [{ path:'resources', model:'ResourceModel' }, populateLetter]
        return ContentItemModel.paginate(filter, options, callback);
    }

    static deleteContentItem(id , callback){
        return ContentItemModel.findByIdAndRemove(id , callback);
    }
}


mongoose.model(ContentItemModel, ContentItemSchema);
module.exports = ContentItemModel;
module.exports.ContentItemType = ContentItemType;
Constant.models['ContentItem'] = {
    name: ContentItemModel.name,
    collection: ContentItemModel.collection.name
};