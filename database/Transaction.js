var mongoose = require('mongoose')
var Constant = require('../constant.js');
var { Model, Schema } = mongoose;

var UserModel = require('./User');

var TransactionMethod = {
    inapp: 1,
    code: 2,
    stripe:3,
    paypal:4
}
var TransactionStatus = {
    pending: 0,
    progressing: 1,
    success: 2, 
    failed: -1
}

var TransactionSchema = new Schema({
    id: Number,
    toUser:{ type: Schema.Types.ObjectId, ref: 'UserModel' },
    dateCreated:{ type: Date, default: Date.now },
    method:{type:Number , default:TransactionMethod.inapp},
    status:{type:Number , default:TransactionStatus.pending},
    createdBy:{ type: Schema.Types.ObjectId, ref: 'UserModel' },
    money: {type:Number , default:0},
    codeUsed: String,
});

var populateDefault = {path:'toUser', select: UserModel.getPublicSelect()};
var populate2 = {path:'createdBy', select: UserModel.getPublicSelect()};


TransactionSchema.pre('save', function(next) {
  var doc = this;
  
  TransactionModel.findOne({}).sort('-id').exec(function(err,  last){
      
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

class TransactionModel extends Model {
    static createTransaction( data , callback) {
        
        if(!data.toUser || !mongoose.Types.ObjectId(data.toUser)){
            throw new Error('no user for target transaction');
            return;
        }
        return TransactionModel.create({
            toUser: data.toUser,
            method: data.method ||TransactionMethod.inapp,
            status: data.status || TransactionStatus.pending,
            createdBy: data.createdBy,
            codeUsed: data.codeUsed
        },callback)
    }

    static updateTransaction( data, callback){
        return TransactionModel.findByIdAndUpdate(data._id, { $set: data }, { new: true } , callback)
    }

    static getTransaction(id , callback){
        return TransactionModel.findById(id , callback).populate(populateDefault).populate(populate2);
    }

    static getTransactionFromUser(userId , callback){
        return TransactionModel.find({toUser: userId} , callback).populate(populateDefault).populate(populate2);
    }

    static getTransactions(data , callback){
        let options = {};
        options['sort'] = data.sort || { registerDate: -1 };
        if (data.limit != undefined) options['limit'] = Number(data.limit);
        if (data.page != undefined) options['page'] = Number(data.page);
        let filter = {};
        if (data.filter && Object.keys(data.filter).length > 0) {
            var fArr = [];
            Object.keys(data.filter).forEach(function (value) {
                if (TransactionSchema.paths[value]) {
                    let f = {};
                    if (Array.isArray(data.filter[value])) {
                        if (data.filter[value].length > 0) f[value] = { $in: data.filter[value] }
                    } else if (typeof data.filter[value] == "number") {
                        f[value] = data.filter[value];
                    } else {
                        if(TransactionSchema.path(value).instance == 'ObjectID'){
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
        options.populate = [populateDefault,populate2]
        return TransactionModel.paginate(filter, options, callback);
    }

    static deleteTransaction(id , callback){
        return TransactionModel.findByIdAndRemove(id , callback);
    }
}


mongoose.model(TransactionModel, TransactionSchema);
module.exports = TransactionModel;
module.exports.TransactionMethod = TransactionMethod ;
module.exports.TransactionStatus = TransactionStatus ;
Constant.models['Transaction'] = {
    name: TransactionModel.name,
    collection: TransactionModel.collection.name
};