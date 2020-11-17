var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var cors =require('cors')
var DatabaseUtil = require('./utils/database.utils')
var Constant = require('./constant')
var app = express();
/**
 * multi language config
 */
const i18n = require('i18n');
i18n.configure({
  locales: ['en'],
  syncFiles: true,
  directory: path.join(__dirname , 'locales')
});
app.use(i18n.init);
app.use(function (req, res, next) {
  // mustache helper
  res.locals.__ = res.__ = function () {
    return i18n.__.apply(req, arguments);
  };
  next();
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));



app.use(cors({
  origin:["http://localhost:3009","http://localhost:8100", "http://localhost:8000","http://kyniema4.hopto.org:3009","http://192.168.1.6:3000","http://192.168.1.7:3000", "http://192.168.1.98:3000", "http://192.168.1.10:3000"],
  methods:"GET,PUT,POST,DELETE, OPTIONS",
  allowedHeaders: ['Content-Type', 'Authorization, X-Requested-With, Accept, Cache-Control, Origin, token'],
  credentials:true
}))
// init authen
require('./utils/setupauthen.util')(app);

// init database
DatabaseUtil.connect(function(err){
  require('./function/afterboot')();
});

// init router
var appRoutesConfig = require('./routes/router.json');
for(var i = 0 ; i < appRoutesConfig.routers.length ; i++){
  var routerItem = appRoutesConfig.routers[i];
  var RouterClass = require(routerItem.pathToFile)
  var router = new RouterClass(routerItem.configFile).router;
  app.use(routerItem.path, router);
}





// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});
// error handler
app.use(function(err, req, res, next) {
  // send error api logs
  for(var i = 0 ; i < appRoutesConfig.routers.length ; i++){
    if(appRoutesConfig.routers[i].path!="/" && req.path.indexOf(appRoutesConfig.routers[i].path) == 0){
      res.locals.message = err.message;
      res.locals.error = req.app.get('env') === 'development' ? err : {};
      // render the error page
      res.status(err.status || 500);
      res.render('error');
      // require('./controller/base.controller').generateMessage(res,err);
      require('./utils/log.utils')('error ' + err.message )
      return;
    }
  }
  // send error view
  res.sendFile(path.join(Constant.rootFolder, 'public/index.html'), function(errReadFile) {
    if (errReadFile) {
      res.locals.message = err.message;
      res.locals.error = req.app.get('env') === 'development' ? err : {};
      // render the error page
      res.status(err.status || 500);
      res.render('error');
      require('./utils/log.utils')('error ' + err.message )
    }
  });
});

module.exports = app;
