// http://ejohn.org/blog/ecmascript-5-strict-mode-json-and-more/
"use strict";

// Optional. You will see this name in eg. 'ps' or 'top' command
process.title = 'interloper-svr';

var s2s = require('./s2s');

// Port where we'll run the websocket server
var webSocketsServerPort = 1337;

// websocket and http servers
var webSocketServer = require('websocket').server;
var http = require('http');

// dao interface to mysql

var Model = require('./model');

/**
 * Global variables
 */
var clients = [ ];
var maxMessageLength = 4096;

/**
 * Helper function for escaping input strings
 */
function htmlEntities(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
                      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
* Helper method for determining username uniquenesss
*/

function checkIfUserExists(name){
  return Model.userExist(name);
}

/**
 * HTTP server
 */
var server = http.createServer(function(request, response) {
    // Not important for us. We're writing WebSocket server, not HTTP server
});
server.listen(webSocketsServerPort, function() {
    console.log((new Date()) + " Server is listening on port " + webSocketsServerPort);
});

/**
 * WebSocket server
 */
var wsServer = new webSocketServer({
    // WebSocket server is tied to a HTTP server. WebSocket request is just
    // an enhanced HTTP request. For more info http://tools.ietf.org/html/rfc6455#page-6
    httpServer: server
});

// This callback function is called every time someone
// tries to connect to the WebSocket server
wsServer.on('request', function(request) {
    console.log((new Date()) + ' Connection from origin ' + request.origin + '.');

    // accept connection - you should check 'request.origin' to make sure that
    // client is connecting from your website
    // (http://en.wikipedia.org/wiki/Same_origin_policy)
    var connection = request.accept(null, request.origin);
    // we need to know client index to remove them on 'close' event
    var index = clients.push({ conn: connection, last_message_time: new Date().getTime()}) - 1;
    console.log("Connections " + clients.length + ", connection idx " + index);
    var address = connection.remoteAddress;
    console.log("Client Address " + address);
    var userName = false;
    var userLoggedIn = false;

    exports.s2sBroadcast = function(message){
       for(var i=0;i < clients.length; i++){
         if(i != index){
           clients[i].conn.sendUTF(message);
         }
       }
    }


    console.log((new Date()) + ' Connection accepted.');

    // user sent some message
    connection.on('message', function(message) {
        if (message.type === 'utf8') { // accept only text
            // process messages
            var messageJson = null;
            try{
              if(message.utf8Data.length > maxMessageLength){
                throw "Message too long!"
              }
              messageJson = JSON.parse(message.utf8Data);
            }catch(e){
              console.error("There was a problem parsing the message " + message.utf8Data + ", " + e);
            }
            console.log("Successfully parsed message from client " + clients[index]);
            if(typeof(clients[index]) == "undefined"){
              console.error("For some reason the index or your client was dropped, please reconnect");
              connection.close();
              return;
            }
            if(messageJson != null){
              clients[index].last_message_time = new Date().getTime();
              switch(messageJson["action"]){
                case "ping":
                  console.log("Received ping from " + clients[index].conn.remoteAddress + " at " + new Date().toLocaleString());
                  break;
                case "register":
                  console.log("Received Register message");
                  Model.userExist(messageJson.userName, function(result){
                      if(result){
                        console.log("User already exists, closing connection");
                        var json = JSON.stringify({action: "register",
                                                   status : "error",
                                                   data : "User Exists"});
                        clients[index].conn.sendUTF(json);
                        connection.close();
                      }else{
                        Model.createUser(messageJson.userName,
                                       clients[index].conn.remoteAddress,
                                       messageJson.password, function(result){
                        if(result != -1){
                            console.log("Created user " + messageJson.userName);
                            var json = JSON.stringify({action: "register",
                                                   status : "success",
                                                   data : { username : messageJson.userName,
                                                            password : messageJson.password,
                                                            message: "Registration success"} });
                            console.log("Sending message back");
                            clients[index].conn.sendUTF(json);
                            for(var i=0;i < clients.length; i++){
                              if(i != index){
                                clients[i].conn.sendUTF(JSON.stringify({action: "history" }));
                              }
                            }
                            userLoggedIn = true;
                        }else{
                           var json = JSON.stringify({action: "register",
                                                      status : "error",
                                                      data : "Problem creating user"});
                           clients[index].conn.sendUTF(json);
                        }
                      });
                    }
                  });
                  break;
                case "login":
                  Model.userLogin(messageJson.userName,messageJson.password, function(result){
                      console.log("The Status " + result);
                      if(!result){
                        console.log("Login unsuccessful");
                        var json = JSON.stringify({action : "login",
                                                   status : "error",
                                                   data : "Login failure"});
                        clients[index].conn.sendUTF(json);
                      }else{
                        userLoggedIn = true;
                        var json = JSON.stringify({action: "login",
                                                   status : "success",
                                                   data : { username : messageJson.userName,
                                                            password : messageJson.password,
                                                            message: "Login success"} });
                        clients[index].conn.sendUTF(json);
                        for(var i=0;i < clients.length; i++){
                          if(i != index){
                            clients[i].conn.sendUTF(JSON.stringify({action: "history" }));
                          }
                        }
                      }
                  });
                  break;
                case "post":
                  if(userLoggedIn == false){
                    connection.close();
                    return;
                  }
                  var obj = {
                    data: {
                       messageData: messageJson["data"].messageData,
                       picUri : messageJson["data"].picUri,
                       hash : messageJson["data"].hash,
                       href : messageJson["data"].href
                    },
                    user: messageJson["user"],
                    action: 'message',
                    type: 'message',
                    messageDate: new Date().getTime()
                  };
                  // broadcast message to all connected clients
                  var json = JSON.stringify(obj);
                  // broadcast to other servers
                  s2s.broadcast(json);
                  for (var i=0; i < clients.length; i++) {
                      console.log("Sending to remote address " + clients[i].conn.remoteAddress);
                      if(i != index){
                          console.log("Sending message to user " + clients[i].conn.remoteAddress);
                          try{
                            clients[i].conn.sendUTF(json);
                          }catch(e){
                            console.error("Couldn't send to user " + clients[i].conn.remoteAddress + ", error " + e);
                            clients[i].conn.close();
                            clients.splice(i,1);
                          }
                      }
                  }
                  break;
                default:
                  connection.close();
                  break;
              }
            }
        }
    });

    // user disconnected
    connection.on('close', function(connection) {
        console.log((new Date()) + " Peer "
            + connection.remoteAddress + " disconnected.");
        // remove user from the list of connected clients
        clients.splice(index, 1);
        index = -1;
        userName = false;
        userLoggedIn = false;
    });
});