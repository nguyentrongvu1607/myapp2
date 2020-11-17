
var express = require('express');
var passport = require('passport')
class BaseRouter{
  constructor(configFileName){
    this.configFileName = configFileName;
    this.router = express.Router();
    this.initRouterFunction();
  }

  initRouterFunction(){
    if(this.configFileName&&this.configFileName.length > 2){
      var config = require('./configs/' + this.configFileName);
      var routerPath = require('./controller/' + config.path);
      var routerControllers = config.controllers;
      for(var i = 0 ; i < routerControllers.length ; i++){
        console.log('init router ' + this.configFileName+ ' path:' + routerControllers[i].path)
        var arrParams = []
        arrParams.push(routerControllers[i].path); // router path

        // parsing params
        arrParams.push(require('../middleware/parseconfig'));

        // check auth
        if(routerControllers[i].authRequired!=0){
          arrParams.push(passport.authenticate('jwt', { session: false }));
        }

        // check middleware of router
        if(config.middleware&& config.middleware.length > 0){
          for(var rMid = 0 ; rMid < config.middleware.length ; rMid++){
            arrParams.push(require('../middleware/' + config.middleware[rMid]));
          }
        }

        // check middleware addtional of controller
        if(routerControllers[i].middleware){
          for(var rMid = 0 ; rMid < routerControllers[i].middleware.length ; rMid++){
            arrParams.push(require('../middleware/' + routerControllers[i].middleware[rMid]));
          }
        }

        

        // target function
        if(routerControllers[i].function){ 
          arrParams.push(routerPath[routerControllers[i].function] );
        }
        

        this.router.all.apply(this.router , arrParams)
        console.log('init router ' + this.configFileName+ ' path:' + routerControllers[i].path + ' success')
      }
    }
    
    this.additionalController();
    
  }

  additionalController(){
    
  }

  
}

module.exports = BaseRouter
