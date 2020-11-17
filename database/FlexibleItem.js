var mongoose = require('mongoose')
var Constant = require('../constant.js');
var { Model, Schema } = mongoose;

var ResourceModel = require('./Resources');
var LetterResourceModel = require('./LetterResource');

var FlexibleItemSchema = new Schema({
    id: Number,
    name: String,
    description: String,
    image: { type: Schema.Types.ObjectId, ref: 'ResourceModel' },
    outsideResource: { type: Schema.Types.ObjectId, ref: 'OutsideResourceModel' },
    url: String,
    otherAppPackageName: String,
    language: {type : Number, default : 1},
    flexible: { type: Schema.Types.ObjectId, ref: 'FlexibleModel' },
    gameId:{ type: Schema.Types.ObjectId, ref: 'GameModel' },
});

FlexibleItemSchema.pre('save', function(next) {
  var doc = this;
  
  FlexibleItemModel.findOne({}).sort('-id').exec(function(err,  last){
      
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

class FlexibleItemModel extends Model {
    static createFlexibleItem( data , callback) {

        return FlexibleItemModel.create({
            name: data.name,
            image:  ((data.resource.length > 0)?data.resource:undefined),
            description: data.description||'',
            outsideResource: data.outsideResource,
            otherAppPackageName: data.otherAppPackageName,
            url: data.url,
            flexible: data.flexible,
            gameId:data.gameId || null
        },callback)
    }

    static updateFlexibleItem( data, callback){
        return FlexibleItemModel.findByIdAndUpdate(data._id, { $set: data }, { new: true } , callback)
    }

    static getFlexibleItem(id , callback){
        return FlexibleItemModel.findById(id , callback).populate('image').populate('outsideResource');
    }

    static getFlexibleItems(data , callback){
        let options = {};
        options['sort'] = data.sort || { registerDate: -1 };
        if (data.limit != undefined) options['limit'] = Number(data.limit);
        if (data.page != undefined) options['page'] = Number(data.page);
        let filter = {};
        if (data.filter && Object.keys(data.filter).length > 0) {
            var fArr = [];
            Object.keys(data.filter).forEach(function (value) {
                if (FlexibleItemSchema.paths[value]) {
                    let f = {};
                    if (Array.isArray(data.filter[value])) {
                        if (data.filter[value].length > 0) f[value] = { $in: data.filter[value] }
                    } else if (typeof data.filter[value] == "number") {
                        f[value] = data.filter[value];
                    } else {
                        if(FlexibleItemSchema.path(value).instance == 'ObjectID'){
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
        
        return FlexibleItemModel.paginate(filter, options, callback);
    }

    static deleteFlexibleItem(id , callback){
        return FlexibleItemModel.findByIdAndRemove(id , callback);
    }
}


mongoose.model(FlexibleItemModel, FlexibleItemSchema);
module.exports = FlexibleItemModel;
// module.exports.FlexibleItemType = FlexibleItemType;
Constant.models['FlexibleItem'] = {
    name: FlexibleItemModel.name,
    collection: FlexibleItemModel.collection.name
};