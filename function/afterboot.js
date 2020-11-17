
var UserModel = require('../database/User')
var Utility = require('../utility');
async function initDefaultValues(){
    initUser();
    // initSetting();
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

function handleTickTimeout(){
    
}

module.exports = async () => {
    await initDefaultValues();
    handleTickTimeout();
    require('../utils/log.utils')('app finished boosting\n');
};