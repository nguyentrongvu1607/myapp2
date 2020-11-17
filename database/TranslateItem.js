var mongoose = require('mongoose')
var Constant = require('../constant.js');
var { Model, Schema } = mongoose;


var TranslateItemSchema = new Schema({
    text: String,
    language: String,
    toLang: String,
    description: String,
    dateRequest:{type:Date, default: Date.now},
    countRequest: {type:Number , default: 0},
    resultFromServer: [String],
    status: {type:Number , default:0},
    tags:[String],
    translatedContent: [String],
    priority:{type:Number , default:1},
    similarSuggestion:[String]
});


var PublicFields = [];

class TranslateItemModel extends Model {
    static createTranslateItem( data , callback) {

        return TranslateItemModel.create({
            text: data.text,
            language: data.language||'en',
            toLang: data.toLang||'undefined',
            description: data.description||'',
            resultFromServer: data.resultFromServer||'',
            tags:data.tags||[],
            translatedContent: data.translatedContent||[]
        },callback)
    }

    static updateTranslateItem( data, callback){
        return TranslateItemModel.findByIdAndUpdate(data._id, { $set: data }, { new: true } , callback)
    }

    static getTranslateItem(id , callback){
        return TranslateItemModel.findById(id , callback);
    }

    static getTranslateItems(data , callback){
        let options = {};
        options['sort'] = data.sort || { registerDate: -1 };
        if (data.limit != undefined) options['limit'] = Number(data.limit);
        if (data.page != undefined) options['page'] = Number(data.page);
        let filter = {};
        if (data.filter && Object.keys(data.filter).length > 0) {
            var fArr = [];
            Object.keys(data.filter).forEach(function (value) {
                if (TranslateItemSchema.paths[value]) {
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
                $or: [{ 'text': { '$regex': data.search, '$options': 'i' } },
                { 'description': { '$regex': data.search, '$options': 'i' }},
                { 'tags': { '$regex': data.search, '$options': 'i' }}
             
            ]
            });
        }
        options.select = PublicFields;
        return TranslateItemModel.paginate(filter, options, callback);
    }

    static deleteTranslateItem(id , callback){
        return TranslateItemModel.findByIdAndRemove(id , callback);
    }
}


mongoose.model(TranslateItemModel, TranslateItemSchema);
module.exports = TranslateItemModel;
Constant.models['TranslateItem'] = {
    name: TranslateItemModel.name,
    collection: TranslateItemModel.collection.name
};