
var UserModel = require('../database/User')
var SettingModel = require('../database/Setting')
var language = require('../database/Unit').language
var Utility = require('../utility');
async function initDefaultValues(){
    initUser();
    initSetting();
}

function initUser(){
    var userRole = UserModel.getUserRole();
    UserModel.countDocuments ({ 'email': 'admin@admin.com' }).then(number => {
        if (!number) {
        return UserModel.create({ fullName: 'admin', email: 'admin@admin.com', password: Utility.createPassword('admin'), role: userRole.Super_Admin });
        }
        return Promise.resolve();
    }).then(user => {
        
    }).catch(e => {
    });
}

async function initSetting(){
    var arrKeyLanguage = Object.keys(language);
    arrKeyLanguage.forEach(async lang=>{
        var newLangSetting = {
            key: 'setting_'+lang,
            displayName:'enable language ' + lang,
            value: '1',
            description: 'Ngôn ngữ ' + lang + ' có thể cho user bắt đầu học chưa',
            collapseKey:'enable_language'
        }
        var oldSetting = await SettingModel.findOne({key:newLangSetting.key})
        if(!oldSetting){
            SettingModel.createSetting(newLangSetting);
        }
    })
}

function handleTickTimeout(){
    
}

module.exports = async () => {
    await initDefaultValues();
    handleTickTimeout();
    require('../utils/log.utils')('app finished boosting\n');
};