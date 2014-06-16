/**
* Interloper server to server communication mechanism
* Will export a method for broadcasting messages, but needs
* a method from the primary interloper server to send messages
* from a current interloper server to this servers' clients
*/

const net = require("net");
const il = require("./interloper");

// servers to connect with
var servers = [ ]
// server to server connections
var s2sConns = [ ]

var server = net.createServer(function(conn){
   console.log("Server: Client connected");

   var index = servers.push(conn) -1;

   // If connection is closed

   conn.on("end", function(){
      // remove server from list of connected servers
      s2sConns.splice(index,1);
      // close the open connection
      conn.close();
   });

   conn.on("data", function(data){
      il.s2sBroadcast(data);
   });

   // send back welcome message

   conn.write(
       JSON.stringify(
         { response: "s2s connected"}
       )
   );

});

server.listen(27563, "0.0.0.0", function(){
  console.log("Server listening");
});

exports.broadcast = function(message){
   for(var i=0; i < servers.length; i++){
     s2sConns[i].write(message);
   }
};