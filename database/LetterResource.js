var mongoose = require('mongoose')
var Constant = require('../constant.js');
var { Model, Schema } = mongoose;

var ResourceModel = require('./Resources');

var LetterResourceSchema = new Schema({
    id: Number,
    letter: String,
    resources:[{ type: Schema.Types.ObjectId, ref: 'ResourceModel' }],
    outsideResources :[{ type: Schema.Types.ObjectId, ref: 'OutsideResourceModel' }]
});

LetterResourceSchema.pre('save', function(next) {
  var doc = this;
  
  LetterResourceModel.findOne({}).sort('-id').exec(function(err,  last){
      
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

class LetterResourceModel extends Model {
    static createLetterResource( data , callback) {

        return LetterResourceModel.create({
            letter: data.letter,
            resources: data.resources || [],
            outsideResources: data.outsideResources || []
            
        },callback)
    }

    static updateLetterResource( data, callback){
        return LetterResourceModel.findByIdAndUpdate(data._id, { $set: data }, { new: true } , callback)
    }

    static getLetterResource(id , callback){
        return LetterResourceModel.findById(id , callback);
    }

    static getLetterResources(data , callback){
        let options = {};
        options['sort'] = data.sort || { registerDate: -1 };
        if (data.limit != undefined) options['limit'] = Number(data.limit);
        if (data.page != undefined) options['page'] = Number(data.page);
        let filter = {};
        if (data.filter && Object.keys(data.filter).length > 0) {
            var fArr = [];
            Object.keys(data.filter).forEach(function (value) {
                if (LetterResourceSchema.paths[value]) {
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
        return LetterResourceModel.paginate(filter, options, callback);
    }

    static deleteLetterResource(id , callback){
        return LetterResourceModel.findByIdAndRemove(id , callback);
    }
}


mongoose.model(LetterResourceModel, LetterResourceSchema);
module.exports = LetterResourceModel;
Constant.models['LetterResource'] = {
    name: LetterResourceModel.name,
    collection: LetterResourceModel.collection.name
};