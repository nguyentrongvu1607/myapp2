'use strict';

function writeLogsBoot(){
    require('../utils/log.utils')('app started\n');
}

async function beforeBootCall(){
    // write system before boot here
}

module.exports = async () => {
    writeLogsBoot();
    await beforeBootCall();
};