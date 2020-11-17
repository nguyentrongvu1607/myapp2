var mongoose = require('mongoose')
var Constant = require('../constant.js');
var { Model, Schema } = mongoose;

var LessionPartModel = require('./LessionPart')

var LessionType = {
    easy:1,
    medium:2,
    advanced:3
}

var LessionSchema = new Schema({
    id: Number,
    name: String,
    description: String,
    image:{ type: Schema.Types.ObjectId, ref: 'ResourceModel' },
    isLimit:{type:Number , default:0},
    type: Number,
    language: {type:Number, default:1},
    tags: [String],
    dateCreated: {type:Date,default: Date.now},
    part:[{ type: Schema.Types.ObjectId, ref: 'LessionPartModel' }],
    unit:{ type: Schema.Types.ObjectId, ref: 'UnitModel' },
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

LessionSchema.pre('save', function(next) {
  var doc = this;
  
  LessionModel.findOne({}).sort('-id').exec(function(err,  last){
      
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

class LessionModel extends Model {
    static createLession( data , callback) {

        return LessionModel.create({
            name: data.name,
            description: data.description || '',
            type: data.type||1,
            tags: data.tags||[],
            part:data.part ||[],
            unit:data.unit,
            language:data.language,
            // image: data.image||null,
            isLimit: data.isLimit || 0,
        },callback)
    }

    static updateLession( data, callback){
        return LessionModel.findByIdAndUpdate(data._id, { $set: data }, { new: true } , callback)
    }

    static getLession(id , callback){
        return LessionModel.findById(id , callback).populate(populateDefault).populate(populateImage).populate('unit');
    }

    static getLessions(data , callback){
        let options = {};
        options['sort'] = data.sort || { registerDate: -1 };
        if (data.limit != undefined) options['limit'] = Number(data.limit);
        if (data.page != undefined) options['page'] = Number(data.page);
        let filter = {};
        if (data.filter && Object.keys(data.filter).length > 0) {
            var fArr = [];
            Object.keys(data.filter).forEach(function (value) {
                if (LessionSchema.paths[value]) {
                    let f = {};
                    if (Array.isArray(data.filter[value])) {
                        if (data.filter[value].length > 0) f[value] = { $in: data.filter[value] }
                    } else if (typeof data.filter[value] == "number") {
                        f[value] = data.filter[value];
                    }else {
                        if(LessionSchema.path(value).instance == 'ObjectID'){
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
        options.populate = [populateDefault]
        return LessionModel.paginate(filter, options, callback);
    }

    static deleteLession(id , callback){
        return LessionModel.findByIdAndRemove(id , callback);
    }
}


mongoose.model(LessionModel, LessionSchema);
module.exports = LessionModel;
module.exports.LessionType = LessionType;
Constant.models['Lession'] = {
    name: LessionModel.name,
    collection: LessionModel.collection.name
};