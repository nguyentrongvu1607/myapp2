
var mongoose = require('mongoose')
var Schema = mongoose.Schema;
const ErrorCode = require('../error_code');
const Promise = require('bluebird');
const __ = require('i18n').__;
const moment = require('moment')
var EventSchema = new Schema({
    eventName: { type: String, default: '' },
    startDate: { type: Date, default: Date.now },
    description: { type: String, default: '' },
    dueDate: { type: Date, default: null },
});


var mongoosePlugin = require('../utils/mongoose.util')
EventSchema.plugin(mongoosePlugin);

var PublicFields = ['eventName', 'startDate', 'about', 'dueDate'];

class EventModel extends mongoose.Model {
    static getPublicFields() {
        return PublicFields;
    }

    static createEvent(info, callback) {
        if (typeof info == 'undefined' || typeof info.eventName == 'undefined' || typeof info.dueDate == 'undefined') {
            return Promise.reject(ErrorCode.MissingParams(info)).asCallback(callback);
        }

        if (info.id || info._id) {
            delete info._id;
            delete info.id
        }

        if(info.startDate)
        {
            delete info.startDate;
        }

        if(moment(info.dueDate).isBefore(moment()))
        {
            return Promise.reject({message:"Due date cannot be before start date"}).asCallback(callback);
        }

        return EventModel.create(info).asCallback(callback);
    }

    static getEventListByCondition(data, callback) {
        let options = {};
        options['sort'] = data.sort || { registerDate: -1 };
        if (data.limit != undefined) options['limit'] = Number(data.limit);
        if (data.page != undefined) options['page'] = Number(data.page);
        let filter = {};
        if (data.filter && Object.keys(data.filter).length > 0) {
            var fArr = [];
            Object.keys(data.filter).forEach(function (value) {
                if (EventSchema.paths[value]) {
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
                $or: [ { 'about': { '$regex': data.search, '$options': 'i' } }]
            });
        }
        options.select = PublicFields;
        return EventModel.paginate(filter, options, callback);
    }

    static updateEventInfo(newInfo, callback) {
        if (!newInfo || !newInfo._id) return Promise.reject(ErrorCode.MissingParams(newInfo)).asCallback(callback);
        return this.findById(newInfo._id).then(oldEvent => {
            if (!oldEvent) return Promise.reject({message:"Event not found"});

            if(newInfo.startDate && newInfo.dueDate)
            {
                if(moment(newInfo.dueDate).isBefore(newInfo.startDate))
                {
                    return Promise.reject({message:"Due date cannot be before start date"}).asCallback(callback);
                }
            }
            else
            {
                if(newInfo.dueDate)
                {
                    if(  moment(newInfo.dueDate).isBefore(moment(oldEvent._doc.startDate)))
                    {
                        return Promise.reject({message:"Due date cannot be before start date"}).asCallback(callback);
                    }
                }

                if(newInfo.startDate)
                {
                    if(moment(oldEvent.dueDate).isBefore(newInfo.startDate))
                    {
                        return Promise.reject({message:"Due date cannot be before start date"}).asCallback(callback);
                    }
                }
            }

            return EventModel.findByIdAndUpdate(newInfo._id, { $set: newInfo }, { new: true }).then(data => {
                return data;
            })
        }).asCallback(callback);
    }

    static deleteEvent(eventId, callback) {
        return EventModel.findByIdAndRemove(eventId, callback)
    }

}

mongoose.model(EventModel, EventSchema);
module.exports = EventModel;
module.exports.PublicFields = PublicFields;
