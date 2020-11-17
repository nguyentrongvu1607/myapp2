var request = require('request')

const NotificationType = {
    TYPE_REG_ID: 1,
    TYPE_CHANNEL: 2,
    TYPE_ALL: 3
}

/**
 * 
 * @param {*} FCM_KEY 
 * @param {*} type 
 * @param  {...any} listVariable 
 * 0: topic name or register Ids
 * 1: title
 * 2: message
 * 3: body
 * 4: click_action
 */
function generateDataMess(FCM_KEY , type , isNotification , ...listVariable){
//     array
// (
//     'registration_ids'  => $registrationIds,
//     'data'          => $dataForMsg ,
//     'notification' => $notification ,
//     'content_available' => true ,
//     'priority' => "high"
// );
    let data = {
        'priority' : "high",
        'content_available': true ,
        'android_channel_id':'topkiddovn'
    }
    
    if(type == NotificationType.TYPE_REG_ID){
        data.registration_ids = listVariable[0]
    }else if(type == NotificationType.TYPE_CHANNEL){
        data.to = '/topics/' + listVariable[0]
    }else{
        data.to = '/topics/topkiddovn' 
    }
    data.data = {
        title: listVariable[1],
        message: listVariable[2],
        body: listVariable[3],
        click_action: listVariable[4],
        otherData: listVariable[5]
    }
    if(isNotification){
        data.notification = {
            title: listVariable[1],
            message: listVariable[2],
            body: listVariable[3],
            click_action: listVariable[4],
            sound:'default',
            otherData: listVariable[5],
            show_notification:true
        }
        data.show_notification = true
    }
    return {
        FCM_KEY: FCM_KEY,
        data: data
    }
}

function sendNotification(data , callback ){
    var options = {
        method: 'POST',
        url: 'https://fcm.googleapis.com/fcm/send',
        headers:
        {
          'content-type': ' application/json',
          'authorization': 'key=' + data.FCM_KEY
        },
        json: data.data
    }
    const chunk = 1000;
    // for (let i = 0, j = registrationIds.length; i < j; i += chunk) {
    // let temparray = registrationIds.slice(i, i + chunk);
    // // do whatever
    // options.json.registration_ids = temparray;
    request(options, (err, response, body) => {
            if (err) return callback&&callback(err);
            callback&&callback(null, { url: body.url, status: response.statusCode, body: body });
        })
    
}

module.exports.sendNotification = sendNotification;
module.exports.NotificationType = NotificationType;
module.exports.generateDataMess = generateDataMess;
