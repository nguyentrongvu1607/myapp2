var fs = require('fs-extra');
// console.log(process.env);

// default folder
const CONFIG_PATH = './config/';
const ROUTER_CONFIG_FILE = CONFIG_PATH + 'router.json'
const DATABASE_CONFIG_FILE = CONFIG_PATH + 'database.json'
const ROUTER_CONFIG_PATH = CONFIG_PATH + 'router/';
const CONTROLLER_PATH = './controller/'

const DATABASE_PATH = './database/';
const DATABASE_CONFIG_PATH = DATABASE_PATH + 'config/';

const ROUTER_FOLDER = './routes/';

// template file  name
const temp_router_config_file = 'routerNote_config.json'
const temp_router_file = 'default_router_class'
const temp_controller_file = 'default_controller_class'
const temp_database_structure_json = 'database_structure.json'
const temp_database_class = 'default_database_class'
//
// variable
//
var nameModules = process.argv[2]||'example1';
var folderForFiles = './templatemodulefiles'




// check folder
var isExist = fs.pathExists(folderForFiles)
if(!isExist){
    console.log('error no folder')
    return;
}
folderForFiles+='/'
//
// copy file
//

// create router config file
var routerItemConfig = require(folderForFiles + temp_router_config_file);
routerItemConfig.name = nameModules;
routerItemConfig.path = nameModules + '.controller.js'
generateTextFile(ROUTER_CONFIG_PATH + nameModules +'.config.json' , routerItemConfig)
// add vao router
var configSystemRouter = require(ROUTER_CONFIG_FILE);
configSystemRouter.routers.push({
    "name":nameModules,
    "pathToFile":"./routes/" + nameModules,
    "path":"/" + nameModules,
    "description":"",
    "configFile":nameModules+".config.json"
})
generateTextFile(ROUTER_CONFIG_FILE , configSystemRouter)

// add vao database config
var configSystemDatabase = require(DATABASE_CONFIG_FILE);
configSystemDatabase.modelList.push({
    "name":nameModules,
    "filePath": nameModules+ ".model" 
})
generateTextFile(DATABASE_CONFIG_FILE , configSystemDatabase)

// tao router class
copyFile(folderForFiles + temp_router_file , ROUTER_FOLDER + nameModules + '.js' )

// tao controller class
copyFile(folderForFiles + temp_controller_file , CONTROLLER_PATH + nameModules + '.controller.js' )

// tao database class
var databaseClass = fs.readFileSync(folderForFiles + temp_database_class).toString();
databaseClass = databaseClass.replace( 'defaultTemplateModelConfig' , nameModules);
fs.writeFile(DATABASE_PATH + nameModules + '.model.js' , databaseClass).then();
// tao database json
var databaseConfig = require(folderForFiles + temp_database_structure_json);
databaseConfig.name = 'tb_' + nameModules + 's';
generateTextFile(DATABASE_CONFIG_PATH + nameModules +'.json' , databaseConfig)

// thong bao
console.log('finished')

// console.log(process.argv);
// fs.copySync(path.resolve(__dirname,'./init/xxx.json'), 'xxx.json');

function generateTextFile(file , _object ){
    fs.writeFile(file, JSON.stringify( _object , null , 4) ).then();
    console.log('write file : ' + file + ' success')
}

function copyFile(oldPath , newPath){
    fs.copyFile(oldPath , newPath).then();
    console.log('write file : ' + newPath + ' success')
}