var mongoose = require('mongoose')
var Constant = require('../constant.js');
var { Model, Schema } = mongoose;

var ResourceFileType = {
    image:1,
    audio:2,
    video:3,
    other:4
}

var ResourceSchema = new Schema({
    id: Number,
    name: String,
    description: String,
    filePath: String,
    location: String,
    localPath: String,
    type: Number,
    tags: [String],
    objectIdTags: [String],
    dateCreated: {type:Date,default: Date.now}
});

ResourceSchema.pre('save', function(next) {
  var doc = this;
  
  ResourceModel.findOne({}).sort('-id').exec(function(err,  last){
      
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

class ResourceModel extends Model {
    static createResource( data , callback) {

        return ResourceModel.create({
            name: data.name,
            description: data.description || '',
            filePath: data.filePath,
            tags: data.tags,
            objectIdTags: data.objectIdTags
        },callback)
    }

    static updateResource( data, callback){
        return ResourceModel.findByIdAndUpdate(data._id, { $set: data }, { new: true } , callback)
    }

    static getResource(id , callback){
        return ResourceModel.findById(id , callback);
    }

    static getResources(data , callback){
        let options = {};
        options['sort'] = data.sort || { registerDate: -1 };
        if (data.limit != undefined) options['limit'] = Number(data.limit);
        if (data.page != undefined) options['page'] = Number(data.page);
        let filter = {};
        if (data.filter && Object.keys(data.filter).length > 0) {
            var fArr = [];
            Object.keys(data.filter).forEach(function (value) {
                if (ResourceSchema.paths[value]) {
                    let f = {};
                    if (Array.isArray(data.filter[value])) {
                        if (data.filter[value].length > 0) f[value] = { $in: data.filter[value] }
                    }else if (typeof data.filter[value] == "number") {
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
        return ResourceModel.paginate(filter, options, callback);
    }

    static deleteResource(id , callback){
        return ResourceModel.findByIdAndRemove(id , callback);
    }
}


mongoose.model(ResourceModel, ResourceSchema);
module.exports = ResourceModel;
Constant.models['Resource'] = {
    name: ResourceModel.name,
    collection: ResourceModel.collection.name
};