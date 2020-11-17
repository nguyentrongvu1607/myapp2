var mongoose = require('mongoose')
var Constant = require('../constant.js');
var { Model, Schema } = mongoose;

var OutsideResourceType = {
    image: 1,
    video: 2,
    audio: 3
}

var OutsideResourceSchema = new Schema({
    id: Number,
    type: Number,
    url: String
});

OutsideResourceSchema.pre('save', function(next) {
  var doc = this;
  
  OutsideResourceModel.findOne({}).sort('-id').exec(function(err,  last){
      
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

class OutsideResourceModel extends Model {
    static createOutsideResource( data , callback) {
        if(typeof data.url == 'undefined'){
            throw new Error('not enough data');
        }
        return OutsideResourceModel.create({
            type: data.type|| OutsideResourceType.image,
            url: data.url 
        },callback)
    }

    static updateOutsideResource( data, callback){
        return OutsideResourceModel.findByIdAndUpdate(data._id, { $set: data }, { new: true } , callback)
    }

    static getOutsideResource(id , callback){
        return OutsideResourceModel.findById(id , callback);
    }

    static getOutsideResources(data , callback){
        let options = {};
        options['sort'] = data.sort || { registerDate: -1 };
        if (data.limit != undefined) options['limit'] = Number(data.limit);
        if (data.page != undefined) options['page'] = Number(data.page);
        let filter = {};
        if (data.filter && Object.keys(data.filter).length > 0) {
            var fArr = [];
            Object.keys(data.filter).forEach(function (value) {
                if (OutsideResourceSchema.paths[value]) {
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
        return OutsideResourceModel.paginate(filter, options, callback);
    }

    static deleteOutsideResource(id , callback){
        return OutsideResourceModel.findByIdAndRemove(id , callback);
    }
}


mongoose.model(OutsideResourceModel, OutsideResourceSchema);
module.exports = OutsideResourceModel;
Constant.models['OutsideResource'] = {
    name: OutsideResourceModel.name,
    collection: OutsideResourceModel.collection.name
};