var Promise = require('bluebird');
class DatabaseUtils{

    constructor(){
    }

    static async connect(callback){
        var dbConfig = require('../constant').dbConfig
        if(dbConfig.type == 2){// connect via sql
            return this.sqlConnect(dbConfig , callback)
        }

        if(dbConfig.type == 1){// connect via mongo
            return this.mongooseConnect(dbConfig , callback);
        }
    }

    static async mongooseConnect(dbConfig , callback){
        var mongoose = require('mongoose');
        var connectStr = 'mongodb://';
        if(dbConfig.username.length > 0){
            connectStr+=dbConfig.username
            if(dbConfig.password.length > 0){
                connectStr+= ':'+ dbConfig.password + '@'
            }
        }

        connectStr+= dbConfig.host + ':' + dbConfig.port + '/' + dbConfig.database;
        mongoose.Promise = Promise;
        mongoose.connect(connectStr, { 
            useUnifiedTopology: true,
            useNewUrlParser:true,
            // useMongoClient: true,
            keepAlive: 30000
        });
        var db = mongoose.connection;
        var mongoosePlugin = require('./mongoose.util');
        mongoose.plugin(mongoosePlugin);
        // Promise.promisifyAll(mongoose); // key part - promisification
        db.on('error', function(){
            if(callback){
                callback('connection error');
            }
        });
        db.once('open', function () {
            if(callback){
                callback();
            }
        });
        return db;
    }

    static async sqlConnect(dbConfig , callback){
        var mysql      = require('mysql');
        
        this.connection = mysql.createConnection({
            host     : dbConfig.host,
            user     : dbConfig.username,
            password : dbConfig.password,
            database : dbConfig.database,
            port     : dbConfig.port
        });
        
        this.connection.connect(function(err) {
            callback&&callback(err);
            // if (err) {
            //     console.error('error connecting: ' + err.stack);
            //     return;
            // }
            
            // console.log('connected as id ' + connection.threadId);
        });
        this.connection.on('error', function(err) {
            console.log('db error', err);
            if(err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
              DatabaseUtils.sqlConnect();                         // lost due to either server restart, or a
            } else {                                      // connnection idle timeout (the wait_timeout
            //   throw err;                                  // server variable configures this)
            }
        });
    }

    static async sqlQuery(sql , args ){
        var mysql      = require('mysql');
        var dbConfig = require('../constant').dbConfig
        if(!this.connection){
            this.connection = mysql.createConnection({
                host     : dbConfig.host,
                user     : dbConfig.username,
                password : dbConfig.password,
                database : dbConfig.database,
                port     : dbConfig.port
            });
        }
        
        return new Promise( ( resolve, reject ) => {
            this.connection.query( sql, args, ( err, rows ) => {
                if ( err )
                    return reject( err );
                resolve( rows );
            } );
        });
    }

    static getConnection(){
        if(this.connection != null){
            return this.connection;
        }
        var mysql      = require('mysql');
        var dbConfig = require('../constant').dbConfig
        
        this.connection = mysql.createConnection({
            host     : dbConfig.host,
            user     : dbConfig.username,
            password : dbConfig.password,
            database : dbConfig.database,
            port     : dbConfig.port
        });
        return this.connection;
    }

    static closeConnection(){
        if(this.connection){
            this.connection.end(function(err) {
                // The connection is terminated now
            })
        }
    }

    static async initTable(tableName , structure ){
        var res = CREATE_TB + tableName+'(';
        var strucs= Object.keys(structure);
        for(var i = 0 ; i < strucs.length ; i++){
            var key = strucs[i];
            res+= key + ' ' + structure[key] ;
            // if(structure[key].indexOf('varchar') >=0){
            //     res+= ' COLLATE utf8_general_ci' 
            // }
            if(i<strucs.length-1){
                res+=','
            }
        }
        res += ')';
        return DatabaseUtils.sqlQuery(res);
    }
    

    
}
const CREATE_TB = 'create table if not exists ';
module.exports = DatabaseUtils