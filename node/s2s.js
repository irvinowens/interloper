/**
* Interloper server to server communication mechanism
* Will export a method for broadcasting messages, but needs
* a method from the primary interloper server to send messages
* from a current interloper server to this servers' clients
*/

var config = require('./config');

const il = require("./interloper");

// websocket and http servers
var WebSocketServer = require('websocket').server;
var WebSocketClient = require('websocket').client;
var http = require('http');

var webSocketsServerPort = config.getS2sWebSocketsServerPort();

// servers to connect with
var servers = config.getS2sServersToFederate();
// server to server connections
var s2sConns = [ ];

exports.gets2sconns = function(){
  return JSON.stringify({ active: s2sConns.length});
}

/**
 * HTTP server
 */
var server = http.createServer(function(request, response) {
    console.log((new Date()) + ' HTTP server. URL' + request.url + ' requested.');
    if (request.url === '/status') {
        response.writeHead(200, {'Content-Type': 'application/json'});
        var responseObject = {
            currentClients: clients.length,
            s2sConnected : s2s.gets2sconns()
        }
        response.end(JSON.stringify(responseObject));
    } else {
        response.writeHead(404, {'Content-Type': 'text/plain'});
        response.end('Sorry, unknown url');
    }
});
server.listen(webSocketsServerPort, function() {
    console.log((new Date()) + " Server is listening on port " + webSocketsServerPort);
});

/**
 * WebSocket server
 */
var wsServer = new WebSocketServer({
    // WebSocket server is tied to a HTTP server. WebSocket request is just
    // an enhanced HTTP request. For more info http://tools.ietf.org/html/rfc6455#page-6
    httpServer: server,
    autoAcceptConnections : false
});

wsServer.on('request', function(request) {

   console.log("Server: Client connected");

   var connection = request.accept('interloper-s2s', request.origin);

   var index = s2sConns.push(connection) -1;

   // If connection is closed

   connection.on("close", function(){
      // remove server from list of connected servers
      s2sConns.splice(index,1);
   });

   connection.on("message", function(message){
      if (message.type === 'utf8') { // accept only text
        //console.log("Receiving message from other servers " + message.utf8Data);
        il.s2sBroadcast(message.utf8Data);
      }
   });

});

// export the broadcast function

exports.broadcast = function(message){
   //console.log("Sending message to to other servers " + message.toString());
   for(var i=0; i < s2sConns.length; i++){
     s2sConns[i].sendUTF(message);
   }
};

var connectToServer = function(serverConfig){
  var host = serverConfig.host;
  var port = serverConfig.port;
  var client = new WebSocketClient();

  client.on('connectFailed', function(error){
    console.log("Connection Error: " + error.toString());
  });

  client.on('connect', function(connection){
    console.log("Connected to " + host + ", on port " + port);
    // send a greeting message
    connection.sendUTF(JSON.stringify({
      action : "ping"
    }));
    s2sConns.push(connection);

    connection.on('error', function(error){
      console.log("Connection error: " + error.toString());
    });

    connection.on('close',function(){
      for(var i=0; i< s2sConns.length; i++){
         if(s2sConns[i] === connection){
           s2sConns.splice(i,1);
           break;
         }
       }
       console.log("Closed server to server connection with " + connection.remoteAddress);
    });

    connection.on('message', function(message){
       if(message.type === 'utf8'){
          //console.log("Emitting message to connected clients " + message.utf8Data);
          il.s2sBroadcast(message.utf8Data);
       }
    });
  });

  client.connect('ws://' + host + ':' + port, 'interloper-s2s');
};

// s2s connect to other servers
for(var i=0; i < servers.length; i++){
   connectToServer(servers[i]);
};