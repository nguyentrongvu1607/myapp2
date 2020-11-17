var url = require('url');

function parseconfig(req, res , next){
    var url_parts = url.parse(req.url, true);
    // var routerName =  url.parse(req.baseUrl, true);

    var routerConfigs = require('../routes/router.json' )
    
    
    for(var rc = 0 ; rc < routerConfigs.routers.length ; rc++){
        if(routerConfigs.routers[rc].configFile && routerConfigs.routers[rc].path == req.baseUrl){
            var configFileForThisRequest = require('../routes/configs/' + routerConfigs.routers[rc].configFile);
            for(var cf = 0 ; cf < configFileForThisRequest.controllers.length ; cf++){
                if(configFileForThisRequest.controllers[cf].path == url_parts.pathname){
                    req.controllerConfig = configFileForThisRequest.controllers[cf];
                    next();
                    return;
                }
            }
        }
    }
    next();
}
module.exports = parseconfig