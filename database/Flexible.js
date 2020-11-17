var mongoose = require('mongoose')
var Constant = require('../constant.js');
var { Model, Schema } = mongoose;

var ResourceModel = require('./Resources');
var LetterResourceModel = require('./LetterResource');

// 1. WORDLIST. Như đã nói
// 2. MUSIC - lựa nhạc từ các chủ đề (Link nhạc lấy từ youtube)
// 3. Read-along stories - Lựa truyện từ các chủ đề (link video lấy từ youtube)
// 4. Bed-time stories - Lựa truyện từ các chủ đề (link video lấy từ youtube)
// 5. Mini games
// 6. Read out loud - Là cái API Text to speech. (tách từ trong Wordlist ra - Trong wordlist cũng có cái y chang, đặt tên y chang luôn, đừng đặt read it myself)
var FlexibleType = {
    WORDLIST: 1,
    MUSIC:2,
    READALONG:3,
    BEDTIME:4,
    GAME:5,
    READOUTLOUD:6,
}

var FlexibleSchema = new Schema({
    id: Number,
    name: String,
    description: String,
    type: Number,
    image: { type: Schema.Types.ObjectId, ref: 'ResourceModel' },
});

FlexibleSchema.pre('save', function(next) {
  var doc = this;
  
  FlexibleModel.findOne({}).sort('-id').exec(function(err,  last){
      
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

class FlexibleModel extends Model {
    static createFlexible( data , callback) {

        return FlexibleModel.create({
            name: data.name,
            type: data.type ||FlexibleType.WORDLIST,
            image:  ((data.resource.length > 0)?data.resource:undefined),
            description: data.description||'',
            
        },callback)
    }

    static updateFlexible( data, callback){
        return FlexibleModel.findByIdAndUpdate(data._id, { $set: data }, { new: true } , callback)
    }

    static getFlexible(id , callback){
        return FlexibleModel.findById(id , callback).populate('image');
    }

    static getFlexibles(data , callback){
        let options = {};
        options['sort'] = data.sort || { registerDate: -1 };
        if (data.limit != undefined) options['limit'] = Number(data.limit);
        if (data.page != undefined) options['page'] = Number(data.page);
        let filter = {};
        if (data.filter && Object.keys(data.filter).length > 0) {
            var fArr = [];
            Object.keys(data.filter).forEach(function (value) {
                if (FlexibleSchema.paths[value]) {
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
        return FlexibleModel.paginate(filter, options, callback);
    }

    static deleteFlexible(id , callback){
        return FlexibleModel.findByIdAndRemove(id , callback);
    }
}


mongoose.model(FlexibleModel, FlexibleSchema);
module.exports = FlexibleModel;
module.exports.FlexibleType = FlexibleType;
Constant.models['Flexible'] = {
    name: FlexibleModel.name,
    collection: FlexibleModel.collection.name
};