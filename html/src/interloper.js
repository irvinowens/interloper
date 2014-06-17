/** @jsx React.DOM */
/**
* The main file for the interloper javascript library
*/

/**
* The Address for the remote websocket server we want to use
*/

wsAddr = 'ws://ec2-54-184-126-128.us-west-2.compute.amazonaws.com:1337';

/**
* The Interloper scope contains the model
*/

var Interloper = (function(){
  var dirty = true;
  var postCache = { };
  window.WebSocket = window.WebSocket || window.MozWebSocket;
  console.log("Connecting websocket");
  try{
  var connection = new WebSocket(wsAddr);

  connection.onopen = function(){
      console.log("Connection open");
      // evaluate whether we need to login at all or do we have credentials already
      if(localStorage["interloper.username"]){
           loginUser(localStorage["interloper.username"],
                     localStorage["interloper.password"]);
      }
  };

  connection.onerror = function(error){
    console.log("Connection error: " + error);
    document.getElementById("notification").innerHTML = "Connection error, click to retry!";
    document.getElementById("notification").className = "visible";
  };

  connection.onclose = function(){
    console.log("Websocket closed");
    console.log("Reconnecting websocket");
    var onOpenHandler = connection.onopen;
    var onCloseHandler = connection.onclose;
    var onErrorHandler = connection.onerror;
    var onMessageHandler = connection.onmessage;
    setTimeout(function(){
       connection = new WebSocket(wsAddr);
       connection.onopen = onOpenHandler;
       connection.onclose = onCloseHandler;
       connection.onerror = onErrorHandler;
       connection.onmessage = onMessageHandler;
       console.log("Websocket connection re-established");
    }, 1000);
  };

  connection.onmessage = function(message){
        var json = null;
        try{
          json = JSON.parse(message.data);
          switch(json.action){
            case "login":
              if(json.status == "success"){
                onSuccessfulLogin(json);
              }else{
                onUnsuccessfulLogin(json);
              }
              break;
            case "history":
              sendAll();
              break;
            case "register":
              console.log("Processing registration response");
              if(json.status == "success"){
                onSuccessfulRegistration(json);
              }else{
                onUnsuccessfulRegistration(json);
              }
              break;
            case "message":
              onMessage(json);
            break;
            default:
              console.log("Received a message that we can't process " + message.data);
              break;
          }
        } catch(e){
          console.log('This dosen\'t look like valid JSON:  ', message.data, ' error ' + e);
          return;
        }
        // handle incoming message

   };

     }catch(e){
        console.log("There was an error setting up the WS " + e);
        document.getElementById("notification").innerHTML = "Connection error, click up here to reconnect!";
        document.getElementById("notification").className = "visible";
     }
   // check to see if we support local storage
   var supports_html5_storage = function(){
     try{
       return 'localStorage' in window && window['localStorage'] !== null;
     }catch(e){
       return false;
     }
   };

   // handle window refresh to cleanly close the websocket
   window.onbeforeunload = function() {
       connection.onclose = function () {}; // disable onclose handler first
       connection.close();
   };


   // react to a successful login attempt

   var onSuccessfulLogin = function(json){
      console.log("Successful Login, " + json);
      // disable login and registration UI
      document.getElementById("register").style.display = "none";
      document.getElementById("login").style.display = "none";
      writeLoginData(json.data.username, json.data.password);
      // make a more user friendly alert
      sendAll();
   };

   // react to an unsuccessful login attempt

   var onUnsuccessfulLogin = function(json){
      console.error("Failed login attempt, " + json.message);
      document.getElementById("notification").innerHTML = "Failed login click to retry";
      document.getElementById("notification").className = "visible";
   };

  // react to a successful login attempt

  var onSuccessfulRegistration = function(json){
     console.log("Successful Registration, " + json);
     // disable login and registration UI
     document.getElementById("register").style.display = "hidden";
     document.getElementById("login").style.display = "hidden";
     writeLoginData(json.data.username, json.data.password);
     // make a more user friendly alert
  };

  // react to an unsuccessful login attempt

  var onUnsuccessfulRegistration = function(json){
    console.error("Failed registration attempt, " + json.message);
    document.getElementById("notification").innerHTML = "Failed registration click to retry";
    document.getElementById("notification").className = "visible";
  };

  var notifyIfMessageContainsMe = function(username, messageText){
       //console.log("Checking to see if we should notify");
       var regex = /(<([^>]+)>)/ig
       if(messageText.indexOf("@" + username) == -1){
         // no mention of me :-(
         //console.log("no mention of me");
         return;
       }
       var converter = new Showdown.converter();
       var htmlContent = converter.makeHtml(decodeURI(messageText));
       if(!("Notification" in window)){
         console.log("This browser does not support notifications");
         return;
       }
       else if(Notification.permission == "granted"){
         //console.log("Showing notification");
         var notification = new Notification('Interloper Mention!', { icon: 'img/bt_rocket.png', body: htmlContent.replace(regex, " ") });
       }
       else if(Notification.permission !== 'denied'){
         console.log("We need to request permission...");
         Notification.requestPermission(function(permission){

             if(!('permission' in Notification)) {
               console.log("Saving the users' answer");
               Notification.permission = permission;
             }

             if(permission == "granted"){
               console.log("The user granted the notifications, so let's go");
               var notification = new Notification('Interloper Mention!', { icon: 'img/bt_rocket.png', body: htmlContent.replace(regex, " ") });
             }

         });
       }
  };

  // react to incoming message

  var onMessage = function(json){
    var user = json.user;
    var dateTime = json.messageDate;
    var data = json.data;
    var href = json.data.href;
    //console.log("Inbound href message " + href);
    var numPosts = parseInt(localStorage["interloper.posts.count"])
    for(var i=0; i < numPosts; i++){
      var post = JSON.parse(localStorage["interloper.posts." + i]);
      if(post.hash == data.hash){
        return;
      }
    }
    notifyIfMessageContainsMe(localStorage["interloper.username"], data.messageData);
    //console.log("Saving content!");
    Interloper.setDirty();
    writeNextPost(data.picUri, decodeURI(data.messageData), user, data.hash, dateTime, href);
  };

   // set the post count object so that it isn't null

   if(supports_html5_storage()){
     if(localStorage["interloper.posts.count"] == null){
       localStorage["interloper.posts.count"] = 0
     }
   };

   var writeLoginData = function(username, password){
     if(!supports_html5_storage()){
       console.log("This browser doesn't support localstorage!!!!");
       return false;
     }
     localStorage["interloper.username"] = username;
     localStorage["interloper.password"] = password;
   };

   // internal login method

   var loginUser = function(uname, pwd){
       comm('{ "action": "login", "userName":"' + uname + '","password":"' + pwd + '" }');
   }

   var pingInterval = setInterval(function(){
      comm('{ "action":"ping" }');
   }, (10 * (60 * 1000)))

   var historyInterval = setInterval(function(){
         comm('{ "action":"ping" }');
      }, (10 * (60 * 1000)))

   var waitForConnection = function(){
       setTimeout(
               function () {
                   if (connection.readyState === 1) {
                       //console.log("Connection is made")
                       return;

                   } else {
                       console.log("wait for connection...")
                       if(connection.readyState === 2 ||
                          connection.readyState === 3){
                            console.log("Error sending! ");
                            document.getElementById("notification").innerHTML = "Connection error, click to reconnect!";
                            document.getElementById("notification").className = "visible";
                          throw new Error("Connection closed");
                        }
                       waitForConnection();
                   }

               }, 5); // wait 5 milisecond for the connection...
   };

   // internal communication method

   var comm = function(message){
     //console.log("Sending: " + message);
     var errDialog = function(){
        console.log("Error sending! " + e);
        document.getElementById("notification").innerHTML = "Connection error, click to reconnect!";
        document.getElementById("notification").className = "visible";
     }
     try{
       //console.log("Trying send...");
       try{
         waitForConnection();
       }catch(e){
          errDialog();
       }
       try {
         connection.send(message);
       }catch(e){
         errDialog();
       }
     }catch(e){
       errDialog();
     }
   }

   // send a message

   var sendPostMessage = function(username, content, picuri, hash, href) {
     //console.log("href value " + href);
     comm('{ "action": "post", "user": "' + username + '", "data": { "messageData": "' +
                                                    encodeURI(content) + '", "picUri": "' + picuri + '", "hash":"' + hash + '","href":"' + href + '" } }');
   }

   // send all message we have so far to everyone

   var sendAll = function(){
     var numPosts = parseInt(localStorage["interloper.posts.count"])
     //console.log("Number of posts " + numPosts);
     for(var i=0; i < numPosts; i++){
       //console.log("Sending " + localStorage["interloper.posts." + i]);
       var post = null;
       if(Interloper.getItemFromCache("interloper.posts." + i) == null){
          post = JSON.parse(localStorage["interloper.posts." + i]);
       }else{
         post = Interloper.getItemFromCache("interloper.posts." + i);
       }
       sendPostMessage(post.user, decodeURI(post.postContent), post.picuri, post.hash, post.href);
       if(i > 1000){
         break;
       }
     }
   }

   // get block list
   var getBlockList = function(){
     if(localStorage["interloper.blocklist"] == null){
       return ["undefined"];
     }else{
       return JSON.parse(localStorage["interloper.blocklist"]);
     }
   }

   // add to block list
   var addUserToBlockList = function(name){
       var blocklist = getBlockList();
       blocklist.push(name);
       localStorage["interloper.blocklist"] = JSON.stringify(blocklist);
   }

   // remove user from blocklist
   var removeUserFromBlocklist = function(name){
     var blocklist = getBlockList();
     var index = -1;
     for(var i=0; i < blocklist.length; i++){
        if(blocklist[i] == name){
          index = i;
          break;
        }
     }
     blocklist.splice(index,1);
     localStorage["interloper.blocklist"] = JSON.stringify(blocklist);
   }

   // determine if user is in blocklist
   var isUserBlocked = function(name){
      var blocklist = getBlockList();
      for(var i=0; i < blocklist.length; i++){
         if(blocklist[i] == name){
           return true;
         }
      }
      return false;
   }


   // write post to local storage

   var writeNextPost = function(picuri, content, user, hash, dateTime, href){
     if(localStorage["interloper.username"] == null){
        console.log("You must be logged in to post");
        document.getElementById("notification").innerHTML = "You must log in or register to post!";
        document.getElementById("notification").className = "visible";
        return;
     }
     var numPosts = parseInt(localStorage["interloper.posts.count"]);
     localStorage["interloper.posts." + numPosts] = '{ "picuri": "' + picuri +
                  '", "postContent": "' + encodeURI(content) + '", "user" : "' + user + '", "hash" : "' + hash + '", "time":"' + dateTime + '","href":"' + href + '" }';
     localStorage["interloper.posts.count"] = numPosts + 1;
     Interloper.setDirty();
   }

   // public methods
   return {
       // only refresh if flag is dirty
       setDirty : function(){
          dirty = true;
       },
       // clean up
       setClean : function(){
          dirty = false;
       },
       getDirty : function(){
         return dirty;
       },
       // cache posts
       getItemFromCache : function(key){
         return postCache[key];
       },
       addItemToCache : function(key,value){
         postCache[key] = value;
       },
       // get blocklist
       getBlockedUsers : function(){
            return getBlockList();
       },
       // add user to blocklist
       blockUser : function(name){
         addUserToBlockList(name);
       },
       // remove user from blocklist
       unblockUser : function(name){
         removeUserFromBlocklist(name);
       },
       // check is user blocked?
       userBlocked : function(name){
         return isUserBlocked(name);
       },
       // add post if we support local storage
       addPost : function(picuri, content, user, hash, dateTime, href){
         if(!supports_html5_storage()) {
           console.log("This browser doesn't support localstorage!!!!");
           return false;
         }
         if(content == ""){
           return;
         }
         if(localStorage["interloper.username"] == null){
           console.log("You must be logged in to post");
           document.getElementById("notification").innerHTML = "You must log in or register to post!";
           document.getElementById("notification").className = "visible";
           return;
         }
         var numPosts = parseInt(localStorage["interloper.posts.count"])
         try{
           writeNextPost(picuri, content, user, hash, dateTime, href);
         }catch(e){
           localStorage.removeItem("interloper.posts." + numPosts);
           addPost(picuri, content, user, hash, dateTime, href);
         }
         sendPostMessage(localStorage["interloper.username"], content, picuri, hash, href);
         Interloper.setDirty();
       },

       // gets all of the posts

       getPosts : function(searchText){
         //console.log("Getting posts");
         if(!supports_html5_storage()) {
           console.log("This browser doesn't support localstorage!!!!");
           return false;
         }
         var arr = [ ];
         var postCount = parseInt(localStorage["interloper.posts.count"]);
         //console.log("Post Count: " + postCount);
         for(var i=(postCount - 1); i > -1; i--){
           var parsedRecord = Interloper.getItemFromCache("interloper.posts." + i);
           if(parsedRecord == null){
             parsedRecord = JSON.parse(localStorage["interloper.posts." + i]);
             Interloper.addItemToCache(["interloper.posts." + i],parsedRecord);
           }else{
             parsedRecord = Interloper.getItemFromCache("interloper.posts." + i);
           }
           if(isUserBlocked(parsedRecord.user) == false){
             if(searchText == null){
               parsedRecord.conversations = Interloper.getConversations(parsedRecord.hash);
               parsedRecord.isPartOfConvo = Interloper.isPartOfConvo(parsedRecord.href);
               arr.push(parsedRecord);
             }else{
               var obj = parsedRecord
               var content = decodeURI(obj.postContent);
               if(content.toLowerCase().search(searchText.toLowerCase()) != -1 ||
                  obj.user.toLowerCase().search(searchText.toLowerCase()) != -1){
                 obj.conversations = Interloper.getConversations(obj.hash);
                 parsedRecord.isPartOfConvo = Interloper.isPartOfConvo(obj.href);
                 arr.push(obj);
               }
             }
           }
         }
         return arr.sort(function(a,b){ return a.time - b.time}).reverse();
       },

       // get conversation items
       getConversations : function(topicHash){
         if(!supports_html5_storage()) {
            console.log("This browser doesn't support localstorage!!!!");
            return false;
          }
          var arr = [ ];
          var postCount = parseInt(localStorage["interloper.posts.count"]);
          //console.log("Post Count: " + postCount);
          for(var i=(postCount - 1); i > -1; i--){
            var parsedRecord = Interloper.getItemFromCache("interloper.posts." + i);
            if(parsedRecord == null){
              parsedRecord = JSON.parse(localStorage["interloper.posts." + i]);
              Interloper.addItemToCache(["interloper.posts." + i],parsedRecord);
            }else{
              parsedRecord = Interloper.getItemFromCache("interloper.posts." + i);
            }
            if(isUserBlocked(parsedRecord.user) == false){
              var obj = parsedRecord
              if(obj.href == topicHash){
                var content = decodeURI(obj.postContent);
                arr.push(obj);
                var otherConvos = Interloper.getConversations(obj.hash);
                arr = arr.concat(otherConvos);
              }
            }
          }
          return arr.sort(function(a,b){ return a.time - b.time}).reverse();
       },

       // check to see if this object has conversations
       hasConversations : function(hash){
         if(!supports_html5_storage()) {
           console.log("This browser doesn't support localstorage!!!!");
           return false;
         }
         var arr = [ ];
         var postCount = parseInt(localStorage["interloper.posts.count"]);
         //console.log("Post Count: " + postCount);
         for(var i=(postCount - 1); i > -1; i--){
           var parsedRecord = Interloper.getItemFromCache("interloper.posts." + i);
           if(parsedRecord == null){
              parsedRecord = JSON.parse(localStorage["interloper.posts." + i]);
              Interloper.addItemToCache(["interloper.posts." + i],parsedRecord);
           }else{
              parsedRecord = Interloper.getItemFromCache("interloper.posts." + i);
           }
           if(isUserBlocked(parsedRecord.user) == false){
              var obj = parsedRecord
              if(obj.href == hash){
                return true;
                break;
              }
           }
          }
         return false;
       },
       // check to see if this item is part of a conversation
       isPartOfConvo : function(href){
          if(!supports_html5_storage()) {
            console.log("This browser doesn't support localstorage!!!!");
            return false;
          }
          var arr = [ ];
          var postCount = parseInt(localStorage["interloper.posts.count"]);
          //console.log("Post Count: " + postCount);
          for(var i=(postCount - 1); i > -1; i--){
           var parsedRecord = Interloper.getItemFromCache("interloper.posts." + i);
           if(isUserBlocked(parsedRecord.user) == false){
             var obj = parsedRecord;
             if(obj.hash == href){
               return true;
               break;
             }
            }
           }
          return false;
       },
       //login
       login : function(uname,pwd){
         loginUser(uname, pwd);
       },

       // register
       register : function(uname, pwd){
         Interloper.communicate('{ "action": "register","userName": "' + uname + '","password":"' + pwd + '" }');
       },

       // communicate with server
       communicate : function(message){
          comm(message);
       },

       // take action on the notification
       notificationTakeAction : function(e){
         e.className = "invisible";
         location.reload();
       }
   };
})();

// post object
var PostBox = React.createClass({
getInitialState : function(e){
    return { postText: "", imageUri: ""}
},
onChange : function(e){
  this.setState({ postText: e.target.value, imageUri: ""});
},
handleSubmit : function(e){
  Interloper.addPost(null, this.state.postText, localStorage["interloper.username"], md5(this.state.postText), new Date().getTime(), null);
  this.refs.post.getDOMNode().value = '';
  if(!("Notification" in window)){
   console.log("This browser does not support notifications");
   return;
  }
  if(Notification.permission !== 'denied'){
   console.log("We need to request permission...");
   Notification.requestPermission(function(permission){

       if(!('permission' in Notification)) {
         console.log("Saving the users' answer");
         Notification.permission = permission;
       }
    });
  }
},
render: function() {
    return (
      <div className="postBox">
        <p><textarea id="postBox" rows="4" cols="75" placeholder="Your post here" onChange={this.onChange} ref="post" /></p>
        <p><input type="button" id="postbutton" value="Post!" onClick={this.handleSubmit} /></p>
      </div>
    );
  }
});

React.renderComponent(<PostBox />, document.getElementById("postBox"));

// registration object
var RegistrationForm = React.createClass({
getInitialState : function(e){
  return {disabled:"", pwd: "Password", uname:"Username"};
},
handleSubmit : function(){
  console.log("Registering user with " + this.state.uname + ", and password " + this.state.pwd);
  Interloper.register(this.state.uname, this.state.pwd);
},
onChange : function(e){
    if(e.target.id == "username"){
       this.setState({disabled:"", uname: e.target.value});
    }else if(e.target.id == "password"){
       this.setState({disabled:"", pwd: e.target.value});
    }else{
      // unknown entity
    }
},
toggleLoginReg : function(e){
  var regDisplay = document.getElementById("register").style.display;
  var loginDisplay = document.getElementById("login").style.display;
  if(regDisplay == "block"){
    document.getElementById("register").style.display = "none";
    document.getElementById("login").style.display = "block";
  }else{
    document.getElementById("register").style.display = "block";
    document.getElementById("login").style.display = "none";
  }
},
render: function(){
  return (
    <div className="registration">
      <form>
      <ul>
        <li><input type="text" id="username" placeholder="username here"
                   onChange={this.onChange} /></li>
        <li><input type="password" id="password" placeholder="password here"
                   onChange={this.onChange} /></li>
        <li><input type="button" id="register" value="Register" onClick={this.handleSubmit} /></li>
      </ul>
      </form>
      <div>
        <a onClick={this.toggleLoginReg}>already a user? login here</a>
      </div>
    </div>
  );
}
});
React.renderComponent(<RegistrationForm />, document.getElementById("register"));
// login object
var LoginForm = React.createClass({
  getInitialState : function(e){
    return {disabled:"", uname:"Username", pwd:"Password"};
  },
  handleSubmit : function(){
    console.log("Logging in user with " + this.state.uname + ", and password " + this.state.pwd);
    Interloper.login(this.state.uname, this.state.pwd);
  },
  onChange : function(e){
      if(e.target.id == "username"){
         this.setState({disabled:"", uname: e.target.value});
      }else if(e.target.id == "password"){
         this.setState({disabled:"", pwd: e.target.value});
      }else{
        // unknown entity
      }
  },
  toggleLoginReg : function(e){
    var regDisplay = document.getElementById("register").style.display;
    var loginDisplay = document.getElementById("login").style.display;
    if(regDisplay == "block"){
      document.getElementById("register").style.display = "none";
      document.getElementById("login").style.display = "block";
    }else{
      document.getElementById("register").style.display = "block";
      document.getElementById("login").style.display = "none";
    }
  },
  render: function(){
    return (
      <div className="login">
        <form>
        <ul>
          <li><input type="text" id="username" placeholder="username here"
                     onChange={this.onChange} /></li>
          <li><input type="password" id="password" placeholder="password here"
                     onChange={this.onChange} /></li>
          <li><input type="button" id="login" value="Login" onClick={this.handleSubmit} /></li>
        </ul>
        </form>
        <div>
          <a onClick={this.toggleLoginReg}>not a user yet? register here</a>
        </div>
      </div>
    );
  }
});
React.renderComponent(<LoginForm />, document.getElementById("login"));

// post list
var PostList = React.createClass({
  getInitialState : function(){
    return {
      items: Interloper.getPosts(null),
      searchText:"",
      blocked : Interloper.getBlockedUsers(),
      blocklistVisibility: 'none',
      conversationItems: [ ],
      conversationTopic: {
                           "postContent":"",
                           "user":"",
                           "time": new Date().getTime()
                          },
      conversationVisible: "convoWindow topicInvisible"
    };
  },
  componentWillMount : function(e) {
    setInterval(function() {
                 if(Interloper.getDirty() == true){
                            console.log("Updating React state for list");
                            this.setState({
                             items: Interloper.getPosts(this.state.searchText),
                             searchText: this.state.searchText,
                             blocked: this.state.blocked,
                             blocklistVisibility: this.state.blocklistVisibility,
                             conversationItems: this.state.conversationItems,
                             conversationTopic: this.state.conversationTopic,
                             conversationVisible: this.state.conversationVisible
                            });
                            Interloper.setClean();
                 }
               }.bind(this),
               this.props.pollInterval);
  },
  onChange : function(e){
    this.setState({
      items: this.state.items,
      searchText: e.target.value,
      blocked : Interloper.getBlockedUsers(),
      blocklistVisibility: this.state.blocklistVisibility,
      conversationItems: this.state.conversationItems,
      conversationTopic: this.state.conversationTopic,
      conversationVisible: this.state.conversationVisible
    })
  },
  manageBlock : function(e){
     this.setState({
       items: Interloper.getPosts(this.state.searchText),
       searchText: this.state.searchText,
       blocked: this.state.blocked,
       blocklistVisibility: 'block',
       conversationItems: this.state.conversationItems,
       conversationTopic: this.state.conversationTopic,
       conversationVisible: this.state.conversationVisible
     })
  },
  blockUser : function(e){
     console.log("User to block " + e.target.getAttribute('alt'));
     Interloper.blockUser(e.target.getAttribute('alt'));
     this.setState({
       items: Interloper.getPosts(this.state.searchText),
       searchText: this.state.searchText,
       blocked: Interloper.getBlockedUsers(),
       blocklistVisibility: this.state.blocklistVisibility,
       conversationItems: this.state.conversationItems,
       conversationTopic: this.state.conversationTopic,
       conversationVisible: this.state.conversationVisible
     });
  },
  hideBlockList : function(e){
     this.setState({
       items: Interloper.getPosts(this.state.searchText),
       searchText: this.state.searchText,
       blocked: Interloper.getBlockedUsers(),
       blocklistVisibility: 'none',
       conversationItems: this.state.conversationItems,
       conversationTopic: this.state.conversationTopic,
       conversationVisible: this.state.conversationVisible
     })
  },
  openConversation : function(e){
     console.log("JSON text " + e.target.getAttribute('alt'));
     var obj = JSON.parse(e.target.getAttribute('alt'));
     var conversationItems = obj.conversations;
     this.setState({
       items: this.state.items,
       searchText : this.state.searchText,
       blocked: this.state.blocked,
       blocklistVisibility: this.state.blocklistVisibility,
       conversationItems: conversationItems,
       conversationTopic: obj,
       conversationVisible : "convoWindow topicVisible"
     });
  },
  hideConvo : function(e){
     this.setState({
       items: this.state.items,
       searchText : this.state.searchText,
       blocked: this.state.blocked,
       blocklistVisibility: this.state.blocklistVisibility,
       conversationItems: this.state.conversationItems,
       conversationTopic: this.state.conversationTopic,
       conversationVisible : "convoWindow topicInvisible"
     });
  },
  updateConvo : function(e){
    var items = Interloper.getPosts(this.state.searchText);
    e.conversations = Interloper.getConversations(e.hash);
    this.setState({
       items: items,
       searchText : this.state.searchText,
       blocked: this.state.blocked,
       blocklistVisibility: this.state.blocklistVisibility,
       conversationItems: e.conversations,
       conversationTopic: e,
       conversationVisible : this.state.conversationVisible
     });
  },
  render : function(){
    var converter = new Showdown.converter();
    var createItem = function(item){
      var getDateTime = function(timeEpoch){
        var d = new Date(0);
        d.setUTCMilliseconds(timeEpoch);
        return d.toLocaleString();
      }
      var hasConvos = (function(){
                        if(item.conversations.length == 0) {
                          return false;
                        } else {
                          return true;
                        }
                       })();
      var isPartOfConvo = item.isPartOfConvo;
      var itemDateTime = getDateTime(item.time);
      var anchorMarkup = (function(){
                          if(isPartOfConvo){
                              return "[Conversation Root](#" + item.href + ")"
                          }else{
                              return ""
                          }
                        })();
      var conversationIndication = (function(){
                                          if(hasConvos){
                                            return "join conversation"
                                          }else{
                                            return "start conversation"
                                          }
                                    })();
      return <div className="postItem" key={item.hash} ref="postList"><a id={item.hash} />
                      <div dangerouslySetInnerHTML={{
                           __html : converter.makeHtml(decodeURI(item.postContent).replace(/&/g, "&amp;").replace(/</g, "&lt;") + " " + anchorMarkup)
                      }} />
                      <div>
                        <span className="smalltext">{item.user} ( <a href="javascript://noscript;" onClick={this.manageBlock} alt={item.user}>manage</a> |
                                                                  <a href="javascript://noscript;" onClick={this.blockUser} alt={item.user}> block</a> )
                         - {itemDateTime} - <a href="javascript://noscript;" onClick={this.openConversation} alt={JSON.stringify(item)}>{conversationIndication}</a></span>
                      </div>
                    </div>;
    };
    var createConvoItem = function(item){
          var getDateTime = function(timeEpoch){
            var d = new Date(0);
            d.setUTCMilliseconds(timeEpoch);
            return d.toLocaleString();
          }
          var itemDateTime = getDateTime(item.time);
          return <div className="postItem" key={item.hash} ref="postList">
                          <div dangerouslySetInnerHTML={{
                               __html : converter.makeHtml(decodeURI(item.postContent).replace(/&/g, "&amp;").replace(/</g, "&lt;"))
                          }} />
                          <div>
                            <span className="smalltext">{item.user} - {itemDateTime}</span>
                          </div>
                        </div>;
        };
    return (
      <div>
      <div id="searchBox">
        <input id="searchBoxInput" placeholder=" Filter" onChange={this.onChange} ref="search" />
      </div>
      <div className="postList">
        {this.state.items.map(createItem.bind(this))}
      </div>
      <BlockList items={this.state.blocked}
                 display={this.state.blocklistVisibility}
                 onHide={this.hideBlockList} />
      <ConversationWindow items={this.state.conversationItems}
                          topic={this.state.conversationTopic}
                          createItem={createConvoItem}
                          convoVisible={this.state.conversationVisible}
                          onHide={this.hideConvo}
                          update={this.updateConvo} />
      </div>
      );
    }
});
// block list window
var BlockList = React.createClass({
  onClick : function(e){
     var name = e.target.ref;
     Interloper.unblockUser(name);
     this.props.onHide(e);
  },
  closeBlockList : function(e){
     this.props.onHide(e);
  },
  render: function(){
      var index = -1;
      var createUserFromList = function(item){
        var unblockText = "Unblock " + item
        index++;
        return <li className="userBlockItem" key={index}><a href="javascript://noscript;" onClick={this.onClick} alt={unblockText} ref={item}>{unblockText}</a></li>
      };
      var blockListStyle = { display: this.props.display };
      return (
        <div className="blockList" ref="blocklist" style={blockListStyle}>
          <p onClick={this.closeBlockList}>X</p>
          <ul className="userBlockList">
            {this.props.items.map(createUserFromList.bind(this))}
          </ul>
        </div>
      )
  }
});
// conversation window
var ConversationWindow = React.createClass({
    handleSubmit : function(e){
       var subjectHash = this.props.topic.hash;
       var postText = this.refs.reply.getDOMNode().value;
       Interloper.addPost(null, postText, localStorage["interloper.username"],
                          md5(postText), new Date().getTime(), subjectHash);
       this.refs.reply.getDOMNode().value = "";
       this.props.update(this.props.topic);
    },
    render: function(){
      var getDateTime = function(timeEpoch){
        var d = new Date(0);
        d.setUTCMilliseconds(timeEpoch);
        return d.toLocaleString();
      }
      var converter = new Showdown.converter();
      return (
         <div className={this.props.convoVisible} ref="convo">
            <p className="closeP" onClick={this.props.onHide}>X</p>
            <div className="topicMessage">
               <div dangerouslySetInnerHTML={{
                    __html : converter.makeHtml(decodeURI(this.props.topic.postContent).replace(/&/g, "&amp;").replace(/</g, "&lt;"))
               }} />
               <div>
                 <span className="smalltext">{this.props.topic.user} - {getDateTime(this.props.topic.time)}</span>
               </div>
            </div>
            <div className="convoPost">
               <p><textarea id="postBox" placeholder="Your reply here" ref="reply" /></p>
               <p><input type="button" value="Reply!" onClick={this.handleSubmit} /></p>
            </div>
            <div className="convoReplies">
               {this.props.items.map(this.props.createItem.bind(this))}
            </div>
         </div>
      )
    }
});
React.renderComponent(<PostList pollInterval={10000} />, document.getElementById("posts"));
