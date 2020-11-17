var mongoose = require('mongoose')
var Constant = require('../constant.js');
var moment = require('moment')
var { Model, Schema } = mongoose;

var ResourceModel = require('./Resources');
var LetterResourceModel = require('./LetterResource');



var TransactionCodeSchema = new Schema({
    id: Number,
    code: String,
    status: Number,
    dateCreated: { type: Date, default: Date.now },
    dateExpired: Date,
    isActive: {type:Number, default:1},
    money: {type:Number , default: 1},
    applyTimes:  {type:Number, default:1},
});

TransactionCodeSchema.pre('save', function(next) {
  var doc = this;
  
  TransactionCodeModel.findOne({}).sort('-id').exec(function(err,  last){
      
        if(doc.id > 0){
            next();
            return;
        }
        if(err || last == null){
            doc.id = 1;
        }else{
            doc.id = last.id + 1;
        }
        if(doc.code.length < 9){
            let prefix = doc.id%10000;
            doc.code =   doc.code +'-' + zeroFill(prefix , 4);
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

class TransactionCodeModel extends Model {
    static createTransactionCode( data , callback) {
        var today = moment();
        var dateExpired = moment(today).add(15, 'days');

        let code = '' + (today.days() + 50 )+ (30+ today.month() * 3 ) ;
        return TransactionCodeModel.create({
            code: code,
            dateExpired: dateExpired,
            applyTimes: data.applyTimes || 1,
        },callback)
    }

    static updateTransactionCode( data, callback){
        return TransactionCodeModel.findByIdAndUpdate(data._id, { $set: data }, { new: true } , callback)
    }

    static getTransactionCode(id , callback){
        return TransactionCodeModel.findById(id , callback);
    }

    static getTransactionCodeByValue(query , callback){
        return TransactionCodeModel.findOne(query , callback);
    }

    static getTransactionCodes(data , callback){
        let options = {};
        options['sort'] = data.sort || { registerDate: -1 };
        if (data.limit != undefined) options['limit'] = Number(data.limit);
        if (data.page != undefined) options['page'] = Number(data.page);
        let filter = {};
        if (data.filter && Object.keys(data.filter).length > 0) {
            var fArr = [];
            Object.keys(data.filter).forEach(function (value) {
                if (TransactionCodeSchema.paths[value]) {
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
        return TransactionCodeModel.paginate(filter, options, callback);
    }

    static deleteTransactionCode(id , callback){
        return TransactionCodeModel.findByIdAndRemove(id , callback);
    }
}


mongoose.model(TransactionCodeModel, TransactionCodeSchema);
module.exports = TransactionCodeModel;
Constant.models['TransactionCode'] = {
    name: TransactionCodeModel.name,
    collection: TransactionCodeModel.collection.name
};