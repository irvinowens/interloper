/**
* Interloper Configuration file
*/

var config = {
  /**
  * Configuration settings for the mysql database master
  */
  database : {
     databaseHostname : "mydbaddress",
     databaseUsername : "mydbusername",
     databasePassword : "mydbpassword",
     databasePort : "mydbportnumber"
  },
  /**
  * Server to server configuration options for federation
  */
  s2s : {
    websocketServerPort : 27563,
    /**
    * Takes tuples like { host: "myhost", port: "9999" }
    */
    otherServers : [ ]
  },
  /**
  * Client to server configuration options
  */
  c2s : {
    websocketServerPort : 1337,
    fullServerHostname : "myfullwebserverhostnameincludinghttp(s)"
  }
}

// Configuration exports

// Will return the database hostname
exports.getDatabaseHostname = function(){
  return config.database.databaseHostname;
}

// Will return the database username
exports.getDatabaseUsername = function(){
  return config.database.databaseUsername;
}

// Will return the database password
exports.getDatabasePassword = function(){
  return config.database.databasePassword;
}

// Will return the database port
exports.getDatabasePort = function(){
  return config.database.databasePort;
}

// Will get the websocket server port for s2s
exports.getS2sWebSocketsServerPort = function(){
  return config.s2s.websocketServerPort;
}

// Get the other servers to federate with
exports.getS2sServersToFederate = function(){
  return config.s2s.otherServers;
}

// Gets the websocket port where clients will connect
exports.getC2sWebSocketServerPort = function(){
  return config.c2s.websocketServerPort;
}

exports.getFullServerHostname = function(){
  return config.c2s.fullServerHostname;
}
