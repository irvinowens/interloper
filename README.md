interloper
==========

Node.js / WebSockets / React.js Distributed Twitter using HTML5 LocalStorage

### Concept

The web was designed to be decentralized, and Interloper grew from a desire
to establish a federated Twitter that had the benefits of a centralized connection
layer, but also preserved the privacy, and durability of data by keeping it on
 the machines of all of the participants.  Think of it as a mesh twitter with no
 central authority holding all of the content.
 
Posts can use Markdown and be generally as long as one wishes.  The server is
limited to 4096 kb and you can reduce that if you wish to keep the bandwidth
down.

It is becoming clear that the role of servers in the future is to be neutral
relays facilitating peer-to-peer communication so Interloper behaves like a
mesh network.  Every user will have and transmit every message.  The web client
will sync with the network every 30 minutes, or whenever the page is reloaded.
 
### Usage

Clone the repository, then change the endpoint to match your 
own for websockets in src/interloper.jsx.  Build the client with Grunt.

<pre>
$ grunt
</pre>

Next upload the server to wherever you'd like to run it, scp is fine, then
deploy the static content anywhere you would like. 

The node/interloper.js does domain verification so you will need to 
change the node/config.js to match your configuration and requirements

#### Registration

The system works via invite.  If you decide you want for someone else to use the system
you can invite them

#### If You Use Grunt

You will want to create the dev, stage, and prod config files under the node/environments
folder as config-dev.js, config-stage.js, and config-prod.js.

Here is the template:

<pre>
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
</pre>

