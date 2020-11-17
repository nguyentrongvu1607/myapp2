
var requestMethod = require('../config/requestmethod.json')
function checkPermission(req, res , next){
    if(req.controllerConfig){
        
        // check method
        var method = req.controllerConfig.method
        if(typeof method!='undefined'&&method!=0&&requestMethod[''+method] && req.method !=requestMethod[''+method]){
            throw new Error('format request incorrect');
        }

        // valid data
        var parsedData = {};
        if(req.controllerConfig.requireValidData&& req.controllerConfig.requireValidData == 1){
            parsedData = req.body.data||{};
            if(typeof parsedData == 'string'){
                parsedData = JSON.parse(parsedData);
            }
        }else{
            if(typeof req.body.data!='undefined'){
                parsedData = req.body.data || {};
                if(typeof parsedData == 'string'){
                    parsedData = JSON.parse(parsedData);
                }
            }else{
                parsedData = req.body;
            }
        }

        if(req.controllerConfig.defineValue){
            req.defineValue = req.controllerConfig.defineValue||{};
        }

        if(method!=1 && req.query){
            var query = require('url').parse(req.url,true).query || {};
            parsedData = {...parsedData , ...query};
        }
        req.parsedData = parsedData;
        // check token
        if(req.controllerConfig.authRequired!=0){
            if (req.isAuthenticated()) {
                console.log('da authen')
                if(typeof req.controllerConfig.requireRole != 'undefined'){ // this is an array for accepted role

                }

                if(typeof req.controllerConfig.minimumRoleAccepted != 'undefined'){ // minimum role for continue

                }
            }else{
                console.log('chua authen ' );
            }
        }
        next();
    }
}
module.exports = checkPermission