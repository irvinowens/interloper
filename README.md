interloper
==========

Node.js / WebSockets / React.js Distributed Twitter using HTML5 LocalStorage

### Concept

The web was designed to be decentralized, and Interloper grew from a desire
to establish a federated Twitter that had the benefits of a centralized connection
layer, but also preserved the privacy, and durability of data by keeping it on
 the machines of all of the participants.  Think of it as a mesh twitter with no
 central authority holding all of the content.
 
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

