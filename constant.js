const rootFolder = __dirname

const dbConfig = require('./config/database.json');
const envConfig = require('./config/environment.json');
const mailConfig = require('./config/email.json');

let Constant = {
  secretKey: envConfig.secretKey,
  rootFolder: rootFolder,
  dbConfig:dbConfig,

  domain: envConfig.domain,
  port: envConfig.port,
  

  uploadFolderName: envConfig.uploadsFolderName,
  uploadFolder: rootFolder + '/public/' + envConfig.uploadsFolderName,
  baseUrl: envConfig.domain + ':' + envConfig.port + '/',

  //  MAILSERVER
  mailConfig: mailConfig,

  // OSTYPE:
  aos: 1, // android: 1
  ios: 2, // iphone: 2
  wos: 3, // webbrowser: 3
  // GENDERTYPE:
  male: 1,
  female: 2,

  models:[],

  // google client
  GOOGLE_CLIENT_ID:'797638895547-qen84pv41muo1hv0aue43o6vklfs69lp.apps.googleusercontent.com',
  GOOGLE_CLIENT_SERECT:'fhZ_4sbLE5UP7qLq69ox4592',

  // facebook 
  facebook_api_key: '1944369115777550',
  facebook_api_secret: '23fdd1ed162334c94156075e9d9fda4d',

  // FCMCONSTANT
  FCM_KEY: 'AIzaSyBzoLYQsfgWcEnWxUDOl3EgizfiVdf0EfM',
  
}
module.exports = Constant
