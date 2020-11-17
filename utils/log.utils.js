
module.exports = (data) => {

    const fs = require('fs');
    var Constant = require('../constant')
    var now = new Date();
    var fileName = 'logs' + ("0" + now.getDate()).slice(-2) +'_' + ("0" + (now.getMonth() + 1)).slice(-2) +'_' + now.getFullYear() +'.txt';

    fs.appendFile(Constant.rootFolder + '/logs/'+fileName, now + ' : ' + data +'\n', function (err) {
    });
};