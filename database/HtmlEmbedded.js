var mongoose = require('mongoose')
var Constant = require('../constant.js');
var moment = require('moment')
var { Model, Schema } = mongoose;

// type embedded
// 1 html
// 2 image
// 3 audio
// 4 video


var HtmlEmbeddedSchema = new Schema({
    id: Number,
    content: String,
    type:Number,
    title: String,
    lessionPart: [{ type: Schema.Types.ObjectId, ref: 'LessionPartModel' }],
    contentItem:  [{ type: Schema.Types.ObjectId, ref: 'ContentItemModel' }],
    dateCreated: {type: Date , default: Date.now},
    resources: { type: Schema.Types.ObjectId, ref: 'ResourceModel' },
    outsideResources :{ type: Schema.Types.ObjectId, ref: 'OutsideResourceModel' },
    attach_audio : { type: Schema.Types.ObjectId, ref: 'ResourceModel' }
});

HtmlEmbeddedSchema.pre('save', function(next) {
  var doc = this;
  
  HtmlEmbeddedModel.findOne({}).sort('-id').exec(function(err,  last){
      
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

function zeroFill(number, width) {
    width -= number.toString().length;
    if(width > 0) {
        return new Array(width + (/\./.test(number) ? 2 : 1)).join('0') + number;
    }
    return number + ""; // always return a string
}

var PublicFields = [];

class HtmlEmbeddedModel extends Model {
    static createHtmlEmbedded( data , callback) {
        var today = moment();
        var dateExpired = moment(today).add(15, 'days');

        let code = '' + (today.days() + 50 )+ (30+ today.month() * 3 ) ;
        return HtmlEmbeddedModel.create({
            content: data.content,
            title: data.title,
            type: data.type,
            lessionPart: data.lessionPart || [],
            contentItem:  data.contentItem ||[],
            outsideResources: data.outsideResources||null,
            resources: data.resources||null,
            attach_audio: data.attach_audio || null
        },callback)
    }

    static updateHtmlEmbedded( data, callback){
        return HtmlEmbeddedModel.findByIdAndUpdate(data._id, { $set: data }, { new: true } , callback)
    }

    static getHtmlEmbedded(id , callback){
        return HtmlEmbeddedModel.findById(id , callback).populate('outsideResources');
    }

    static getHtmlEmbeddedByLessionPartId(lessionPartIds, callback){
        return HtmlEmbeddedModel.find({ lessionPart: { "$in" : lessionPartIds} },callback).populate('resources').populate('outsideResources').populate('attach_audio');
    }

    static getHtmlEmbeddedByValue(query , callback){
        return HtmlEmbeddedModel.findOne(query , callback);
    }

    static getHtmlEmbeddeds(data , callback){
        let options = {};
        options['sort'] = data.sort || { registerDate: -1 };
        if (data.limit != undefined) options['limit'] = Number(data.limit);
        if (data.page != undefined) options['page'] = Number(data.page);
        let filter = {};
        if (data.filter && Object.keys(data.filter).length > 0) {
            var fArr = [];
            Object.keys(data.filter).forEach(function (value) {
                if (HtmlEmbeddedSchema.paths[value]) {
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
        return HtmlEmbeddedModel.paginate(filter, options, callback);
    }

    static deleteHtmlEmbedded(id , callback){
        return HtmlEmbeddedModel.findByIdAndRemove(id , callback);
    }
}


mongoose.model(HtmlEmbeddedModel, HtmlEmbeddedSchema);
module.exports = HtmlEmbeddedModel;
Constant.models['HtmlEmbedded'] = {
    name: HtmlEmbeddedModel.name,
    collection: HtmlEmbeddedModel.collection.name
};