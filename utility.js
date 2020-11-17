const Args = require('vargs').Constructor
const validate = require('validate-fields')()
const fs = require('fs')
const request = require('request')
const http = require('http')
const crypto = require('crypto')
const debug = require('debug')('truck')
var moment = require('moment')
function getVersionApp(){
  var versions = [];
  versions.push({version: 1, dateRelease:  moment('25/11/2016', 'DD/MM/YYYY').toDate() , description:''}); // version 1
  return {lastest_version: 1 , versions: versions};
}

function executeCallback() {
  try {
    const args = new Args(arguments)
    args.callback.apply({}, args.all)
  } catch (e) {

  }
}

function checkFields(arrayFields, checkObject) {
  var missingfields = [];
  for (var i = 0; i < arrayFields.length; i++) {
    if (typeof checkObject[arrayFields[i]] == 'undefined') {
      missingfields.push(arrayFields[i]);
    }
  }
  return missingfields;
}

function checkParams(schema, valueJson) {
  try {
    const value = JSON.parse(valueJson)
    const resultCheck = validate(schema, value)
    let log = ''
    if (resultCheck) {
      debug('Valid!')
      log = value
    } else {
      debug('Invalid', validate.lastError)
      log = validate.lastError
    }
    return { correct: resultCheck, data: log }
  } catch (e) {
    debug('cant execute validate' + e.message)
    return { correct: -1, data: 'fuck' }
  }
}

function generateMessage(res, error, data, header = 400) {
  try {
    debug('exec callback ' + error + ' ' + data);
    if (error) {
      res.status(header)
    } else {
      res.status(200)
    }
    res.json({ success: !error, data: data || error })
  } catch (e) {
    res.status(404);
    res.json({ success: 0, data: e.toString() })
    debug('error when execute callback ' + e.message)
  }
}

function makeHttpRequest(url, params, callback) {
  if (typeof callback === 'undefined') {
    callback = params
  }
  request(url, { json: true }, (err, response, body) => {
    if (err) {
      callback(0, err.message)
      return
    }
    callback(1, { url: body.url, status: response.statusCode, body: body })
    debug(body.url)
    debug(body.explanation)
  })
}

function downloadImage(url, filename, callback) {
  request.head(url, function (err, res, body) {
    debug('content-type:', res.headers['content-type'])
    debug('content-length:', res.headers['content-length'])

    request({
      url: url,
      headers: {
        'accept': 'image/*',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2272.118 Safari/537.36',
      }
    }).pipe(
      fs.createWriteStream(filename).on('error', function (err) {
        debug('error download image ' + err.message)
      })
    ).on('error', function (err) { debug('error down load image ' + err) }).on('close', callback)
  })
}

function getDistance(p1, p2) {
  if (typeof (p1) === 'undefined' || typeof (p2) === 'undefined' || p1 == null || p2 == null) {
    return 99999999999999999999999999999
  }

  const R = 6378137 // Earth’s mean radius in meter
  const dLat = rad(p2.lat - p1.lat)
  const dLong = rad(p2.lng - p1.lng)
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rad(p1.lat)) * Math.cos(rad(p2.lat)) *
    Math.sin(dLong / 2) * Math.sin(dLong / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const d = R * c
  return d // returns the distance in meter
}
/**
 * random location
 * @param {Object} data {
 *  dlat: degree of latitude in range [-90,  90]
 *  mlat: minute of latitude in range [0, 59]
 *  slat: second of latitude in range [0, 59]
 *  dlon: degree of longitude in range [-180, 180]
 *  mlon: minute of longitude in range [0, 59]
 *  slon: second of longitude in range [0 ,59]
 * }
 */
var getLatLng = function (data) {
  var latsign = 1.0;
  var lonsign = 1.0;
  var absdlat = 0;
  var absdlon = 0;
  var absmlat = 0;
  var absmlon = 0;
  var absslat = 0;
  var absslon = 0;

  let compareNumber = function (a, b) {
    if (a < b) return '-';
    else if (a === b) return '=';
    else if (a > b) return '+';
    else return 'z';
  }

  if (compareNumber(data.dlat, 0) == '-') { latsign = -1.0; } else { latsign = 1.0; }
  absdlat = Math.abs(Math.round(data.dlat * 1000000.0));
  // if (compareNumber(absdlat, (90 * 1000000)) == '+') { alert(' Degrees Latitude must be in the range of -90 to 90. '); form10.dlat.value = ''; form10.mlat.value = ''; form10.slat.value = ''; }

  data.mlat = Math.abs(Math.round(data.mlat * 1000000.0) / 1000000);
  absmlat = Math.abs(Math.round(data.mlat * 1000000.0));
  //  if(compareNumber(absmlat, (60 * 1000000)) == '+') {  alert(' Minutes Latitude must be in the range of 0 to 59. ');   form10.mlat.value=''; form10.slat.value=''; }

  data.slat = Math.abs(Math.round(data.slat * 1000000.0) / 1000000);
  absslat = Math.abs(Math.round(data.slat * 1000000.0));
  // if(compareNumber(absslat,  (59.99999999 * 1000000)) ==  '+' ) {  alert(' Seconds Latitude must be 0 or greater \n and less than 60. ');   form10.slat.value=''; }

  if (compareNumber(data.dlon, 0) == '-') { lonsign = -1.0; } else { lonsign = 1.0; }
  absdlon = Math.abs(Math.round(data.dlon * 1000000.0));
  // if(compareNumber(absdlon, (180 * 1000000)) == '+') {  alert(' Degrees Longitude must be in the range of -180 to 180. '); form10.dlon.value=''; form10.mlon.value=''; form10.slon.value='';}

  data.mlon = Math.abs(Math.round(data.mlon * 1000000.0) / 1000000);
  absmlon = Math.abs(Math.round(data.mlon * 1000000));  // integer
  // if(compareNumber(absmlon, (60 * 1000000)) == '+')   {  alert(' Minutes Longitude must be in the range of 0 to 59. ');   form10.mlon.value=''; form10.slon.value=''; }

  data.slon = Math.abs(Math.round(data.slon * 1000000.0) / 1000000);
  absslon = Math.abs(Math.round(data.slon * 1000000.0));
  // if(compareNumber(absslon, (59.99999999 * 1000000)) == '+') {  alert(' Seconds Latitude must be 0 or greater \n and less than 60. ');   form10.slon.value=''; }

  let lat = ((Math.round(absdlat + (absmlat / 60.0) + (absslat / 3600.0)) / 1000000)) * latsign;
  let lng = ((Math.round(absdlon + (absmlon / 60.0) + (absslon / 3600)) / 1000000)) * lonsign;
  return { lat: lat, lng: lng }
}

function rad(x) {
  return x * Math.PI / 180
}

function getTimeFromMinutesAgo(minutes) {
  if (typeof minutes === 'undefined') {
    minutes = 60
  }
  const timeObject = new Date()
  timeObject.setTime(timeObject.getTime() - minutes * 1000 * 60)
  return timeObject
}

function getTimeFromMinutesLater(minutes) {
  if (typeof minutes === 'undefined') {
    minutes = 60
  }
  const timeObject = new Date()
  timeObject.setTime(timeObject.getTime() + minutes * 1000 * 60)
  return timeObject
}

function createPassword(password) {
  return crypto.createHash('md5').update(password).digest('hex')
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min
}
module.exports = {
  executeCallback: executeCallback,
  checkParams: checkParams,
  generateMessage: generateMessage,
  makeHttpRequest: makeHttpRequest,
  downloadImage: downloadImage,
  getDistance: getDistance,
  getTimeFromMinutesAgo: getTimeFromMinutesAgo,
  getTimeFromMinutesLater: getTimeFromMinutesLater,
  createPassword: createPassword,
  getLatLng: getLatLng,
  getRandomInt: getRandomInt,
  getVersionApp:getVersionApp
}