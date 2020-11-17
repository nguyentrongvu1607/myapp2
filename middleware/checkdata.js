var url = require('url');

function checkData(req, res , next){
    
    if(req.parsedData && req.controllerConfig && req.controllerConfig.requireFields){
        var parsedDataKeys = Object.keys( req.parsedData);
        var requireFields = req.controllerConfig.requireFields
        var match = 0;
        for(var rq = 0 ; rq < requireFields.length ; rq++){
            for(var pk = 0 ; pk < parsedDataKeys.length ; pk++){
                if(requireFields[rq] === parsedDataKeys[pk]){
                    match++;
                }
            }
        }
        if(match < requireFields.length){
            throw new Error('not enough data');
        }
        
    }   
    next();
}
module.exports = checkData