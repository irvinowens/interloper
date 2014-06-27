/**
* Interloper DAO, will maintain the connection and interface with the database
*/

// require the mysql plugin
var mysql = require('mysql');
// require the config
var config = require('./config');

// mysql default configuration
var serverHostname = config.getDatabaseHostname();
var serverPort = config.getDatabasePort();
var serverUsername = config.getDatabaseUsername();
var serverPassword = config.getDatabasePassword();
var currentDatabaseVersion = 0;
var dbCreated = false;

// we want to create the pool as soon as we are initialized
var pool = mysql.createPool({
    connectionLimit : 10,
    host : serverHostname,
    user : serverUsername,
    password : serverPassword
  });

// obtain database connection method
connect = function(){
  var connection = null;
  pool.getConnection(function(err, connection){
    if(err){
      console.error('error connecting: ' + err.stack);
      return;
    }
    console.log('connected as id ' + connection.threadId);
  });
  return connection;
}

// disconnect from database
disconnect = function(conn){
   conn.release();
}

// query, takes a query string and a callback method
// with two parameters, err and rows
// will connect, query and then disconnect

exports.q = function(queryStr, queryArgs, callBack){
  pool.getConnection(function(err, conn){
    if(err){
      console.error('error connecting: ' + err.stack);
      return;
    }
    if(dbCreated == false){
        dbCreated = migrate(currentDatabaseVersion);
    }
    var q = conn.query(queryStr, queryArgs, callBack);
    // only enable for debug
    // console.log(q.sql);
    disconnect(conn);
  });
}

// migration stuff
migrate = function(version){
  if(typeof(version) == "undefined" || version >= 0){
      // migrate to version 0
      // create the database if it doesn't already exist
      exports.q('CREATE DATABASE IF NOT EXISTS interloper', null, function(err,rows){
        if(err){
          console.error('There was an error creating DB ' + err.stack);
        }
      });
      exports.q('CREATE TABLE IF NOT EXISTS interloper.users (id INT NOT NULL AUTO_INCREMENT,' +
            ' user_id varchar(84), username varchar(255), password varchar(255),' +
            ' user_ip varchar(84), created_at TIMESTAMP, PRIMARY KEY(id))',null, function(err, rows){
         if(err){
           console.error('There was an error creating users table ' + err.stack);
         }
      });
      exports.q('CREATE TABLE IF NOT EXISTS interloper.meta (id INT NOT NULL AUTO_INCREMENT,' +
                ' db_version int)', null, function(err,rows){
                    if(err){
                      console.error('There was an error creating the meta table ' + err.stack);
                    }
      });
      exports.q('CREATE TABLE IF NOT EXISTS interloper.invites (id INT NOT NULL AUTO_INCREMENT,' +
                ' invite_id varchar(255), created_at TIMESTAMP, PRIMARY KEY(id))', null, function(err, rows){
                  if(err){
                    console.error('There was an error creating the invite table ' + err.stack);
                  }
                });
  }
  return true;
}