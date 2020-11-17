const aws = require('aws-sdk');
const s3config = require('../config/s3config.json')
aws.config.update({
    // Your SECRET ACCESS KEY from AWS should go here,
    // Never share it!
    // Setup Env Variable, e.g: process.env.SECRET_ACCESS_KEY
    secretAccessKey: s3config.secretAccessKey,
    // Not working key, Your ACCESS KEY ID from AWS should go here,
    // Never share it!
    // Setup Env Variable, e.g: process.env.ACCESS_KEY_ID
    accessKeyId: s3config.accessKeyId,
    region: s3config.region // region of your bucket
});
const s3 = new aws.S3();
module.exports={
    aws,
    s3,
    s3bucket: s3config.s3bucket
}