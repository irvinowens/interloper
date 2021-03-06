/** @jsx React.DOM */



/**
* The main file for the interloper javascript library
*/

/**
* The Address for the remote websocket server we want to use
*/

wsAddr = 'wss://interloper.technology/websocket';

// we need a map of the available query params
inviteId = getQueryVariable("invite");

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
      // evaluate whether we need to login at all or do we have credentials
      // already
      if(localStorage["interloper.username"]){
           loginUser(localStorage["interloper.username"],
                     localStorage["interloper.password"]);
      }
      document.getElementById("notification").innerHTML = "Everything is OK!";
      document.getElementById("notification").className = "invisible";
  };

  connection.onerror = function(error){
    console.log("Connection error: " + error);
    document.getElementById("notification").innerHTML = "Connection error, " +
                                                        "click to retry!";
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
    }, 10000);
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
            case "invite_response":
              document.getElementById("infoMessage").innerHTML = "Send this " +
                        " link for a friend to join : " +
                        "https://interloper.technology/?invite=" + json.data;
              document.getElementById("showInfo").className = "visible";
              break;
            default:
              console.log("Received a message that we can't process " +
                           message.data);
              break;
          }
        } catch(e){
          console.log('This dosen\'t look like valid JSON:  ' +
                message.data + ' error ' + e);
          return;
        }
        // handle incoming message

   };

     }catch(e){
        console.log("There was an error setting up the WS " + e);
        document.getElementById("notification").innerHTML = "Connection error,"
         + " click up here to reconnect!";
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
      document.getElementById("notification").innerHTML = "Failed login " +
        "click to retry";
      document.getElementById("notification").className = "visible";
   };

  // react to a successful login attempt

  var onSuccessfulRegistration = function(json){
     console.log("Successful Registration, " + json);
     // disable login and registration UI
     document.getElementById("register").style.display = "none";
     document.getElementById("login").style.display = "none";
     writeLoginData(json.data.username, json.data.password);
     // make a more user friendly alert
  };

  // react to an unsuccessful login attempt

  var onUnsuccessfulRegistration = function(json){
    console.error("Failed registration attempt, " + json.message);
    document.getElementById("notification").innerHTML = "Failed registration " +
        "get invite, then click to retry";
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
         var notification = new Notification('Interloper Mention!',
           {
            icon: 'img/bt_rocket.png',
            body: htmlContent.replace(regex, " ")
           });
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
               var notification = new Notification('Interloper Mention!',
               {
                icon: 'img/bt_rocket.png',
                body: htmlContent.replace(regex, " ")
               });
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
    notifyIfMessageContainsMe(localStorage["interloper.username"],
        data.messageData);
    //console.log("Saving content!");
    writeNextPost(data.picUri, decodeURI(data.messageData), user,
        data.hash, dateTime, href);
    Interloper.setDirty();
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
       comm('{ "action": "login", "userName":"' + uname + '","password":"' +
        pwd + '" }');
   }

   var pingInterval = setInterval(function(){
      if(localStorage["interloper.username"] != null){
        comm('{ "action":"ping" }');
      }
   }, (2 * (60 * 1000)));

   var getUpdates = setInterval(function(){
    if(localStorage["interloper.username"] != null){
        loginUser(localStorage["interloper.username"],
                         localStorage["interloper.password"]);
    }
   }, 1800000);

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
                            document.getElementById("notification").innerHTML =
                                "Connection error, click to reconnect!";
                            document.getElementById("notification").className =
                                "visible";
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
        document.getElementById("notification").innerHTML =
            "Connection error, click to reconnect!";
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
     comm('{ "action": "post", "user": "' + username +
          '", "data": { "messageData": "' +
          encodeURI(content) + '", "picUri": "' + picuri + '", "hash":"' +
          hash + '","href":"' + href + '" } }');
   }

   // Get invitation for user

   var requestInviteToken = function(){
     if(localStorage["interloper.username"] != null){
       comm('{ "action": "get_invite" }');
     }else{
       console.log("You must be logged in to request an invitation");
     }

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
       sendPostMessage(post.user, decodeURI(post.postContent), post.picuri,
        post.hash, post.href);
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
        document.getElementById("notification").innerHTML = "You must log in" +
            " or register to post!";
        document.getElementById("notification").className = "visible";
        return;
     }
     var numPosts = parseInt(localStorage["interloper.posts.count"]);
     localStorage["interloper.posts." + numPosts] = '{ "picuri": "' + picuri +
                  '", "postContent": "' + encodeURI(content) + '", "user" : "' +
                   user + '", "hash" : "' + hash + '", "time":"' +
                   dateTime + '","href":"' + href + '" }';
     localStorage["interloper.posts.count"] = numPosts + 1;
     Interloper.setDirty();
   }

   // clean up the oldest item in the list
   var cleanUpOldestItem = function(){
    var oldestItemKey = null;
    var oldestTime = new Date().getTime();
    for(var i=0; localStorage.length; i++){
        var itemKey = localStorage.key(i);
        if(itemKey.search("posts") != -1){
            var obj = JSON.parse(localStorage.getItem(key));
        }
        if(obj.time < oldestTime){
          oldestTime = obj.time
          oldestItemKey = itemKey;
        }
    }
    localStorage.removeItem(oldestItemKey);
    localStorage["interloper.posts.count"] =
        parseInt(localStorage["interloper.posts.count"]) - 1;
   }

   // public methods
   return {
       requestInvite : function(){
          requestInviteToken();
       },
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
           document.getElementById("notification").innerHTML =
            "You must log in or register to post!";
           document.getElementById("notification").className = "visible";
           return;
         }
         var numPosts = parseInt(localStorage["interloper.posts.count"])
         try{
           writeNextPost(picuri, content, user, hash, dateTime, href);
         }catch(e){
           cleanUpOldestItem();
           localStorage.removeItem("interloper.posts." + numPosts);
           addPost(picuri, content, user, hash, dateTime, href);
         }
         sendPostMessage(localStorage["interloper.username"], content,
            picuri, hash, href);
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
           var parsedRecord =
            Interloper.getItemFromCache("interloper.posts." + i);
           if(parsedRecord == null){
             parsedRecord = JSON.parse(localStorage["interloper.posts." + i]);
             Interloper.addItemToCache(["interloper.posts." + i],parsedRecord);
           }else{
             parsedRecord =
                Interloper.getItemFromCache("interloper.posts." + i);
           }
           if(isUserBlocked(parsedRecord.user) == false){
             if(searchText == null){
               parsedRecord.conversations =
                Interloper.getConversations(parsedRecord.hash);
               parsedRecord.isPartOfConvo =
                Interloper.isPartOfConvo(parsedRecord.href);
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
            var parsedRecord =
                Interloper.getItemFromCache("interloper.posts." + i);
            if(parsedRecord == null){
              parsedRecord = JSON.parse(localStorage["interloper.posts." + i]);
              Interloper.addItemToCache(["interloper.posts." + i],parsedRecord);
            }else{
              parsedRecord =
                Interloper.getItemFromCache("interloper.posts." + i);
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
           var parsedRecord =
            Interloper.getItemFromCache("interloper.posts." + i);
           if(parsedRecord == null){
              parsedRecord = JSON.parse(localStorage["interloper.posts." + i]);
              Interloper.addItemToCache(["interloper.posts." + i],parsedRecord);
           }else{
              parsedRecord =
                Interloper.getItemFromCache("interloper.posts." + i);
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
           var parsedRecord =
            Interloper.getItemFromCache("interloper.posts." + i);
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
       register : function(uname, pwd, invite){
         Interloper.communicate('{ "action": "register","userName": "' +
                                    uname + '","password":"' + pwd +
                                    '","invite": "' + invite + '" }');
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
// turn on touch events
React.initializeTouchEvents(true);
// post object
var PostBox = React.createClass({displayName: 'PostBox',
getInitialState : function(e){
    return {
        postText: "",
        imageUri: "",
        canInvite : true
    }
},
onChange : function(e){
  this.setState({
    postText: e.target.value,
    imageUri: "",
    canInvite : this.state.canInvite
  });
},
handleSubmit : function(e){
  Interloper.addPost(null, this.state.postText,
            localStorage["interloper.username"],
            md5(this.state.postText), new Date().getTime(), null);
  this.refs.post.getDOMNode().value = '';
  this.setState({
      postText: this.state.postText,
      imageUri: this.state.imageUri,
      canInvite : true
  });
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
generateInvite : function(e){
    if(this.state.canInvite == true){
        Interloper.requestInvite();
        this.setState({
            postText: this.state.postText,
            imageUri: this.state.imageUri,
            canInvite : false
        });
    }
},
render: function() {
    return (
      React.DOM.div( {className:"postBox"}, 
        React.DOM.p(null, React.DOM.textarea( {id:"postBox", rows:"4", cols:"75",
                     placeholder:"Your post here",
                     onChange:this.onChange, ref:"post"} )),
        React.DOM.p(null, React.DOM.input( {type:"button", id:"postbutton", value:"Post!",
                  onClick:this.handleSubmit, onTouchEnd:this.handleSubmit} ),
                  React.DOM.a( {href:"javascript://none;",
                     onClick:this.generateInvite, onTouchEnd:this.generateInvite,
                     title:"generate invite", ref:"genvite"}, "Invite Someone!"))
      )
    );
  }
});

React.renderComponent(PostBox(null ), document.getElementById("postBox"));

// registration object
var RegistrationForm = React.createClass({displayName: 'RegistrationForm',
getInitialState : function(e){
  return {
    disabled:"",
    pwd: "Password",
    uname:"Username",
    invite: window.inviteId
  };
},
handleSubmit : function(e){
  console.log("Registering user with " +
  this.state.uname + ", and password " + this.state.pwd);
  Interloper.register(this.state.uname, this.state.pwd, this.state.invite);
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
    React.DOM.div( {className:"registration"}, 
      React.DOM.form(null, 
      React.DOM.ul(null, 
        React.DOM.li(null, React.DOM.input( {type:"text", id:"username", placeholder:"username here",
                   onChange:this.onChange} )),
        React.DOM.li(null, React.DOM.input( {type:"password", id:"password", placeholder:"password here",
                   onChange:this.onChange} ),React.DOM.input( {id:"invite",
                   type:"hidden", onChange:this.onChange,
                   value:this.state.invite} )),
        React.DOM.li(null, React.DOM.input( {type:"button", id:"register", value:"Register",
            onClick:this.handleSubmit, onTouchEnd:this.handleSubmit} ))
      )
      ),
      React.DOM.div(null, 
        React.DOM.a( {onClick:this.toggleLoginReg, onTouchEnd:this.toggleLoginReg}, "already a user? login here")
      )
    )
  );
}
});
React.renderComponent(RegistrationForm(null ),
            document.getElementById("register"));
// login object
var LoginForm = React.createClass({displayName: 'LoginForm',
  getInitialState : function(e){
    return {disabled:"", uname:"Username", pwd:"Password"};
  },
  handleSubmit : function(){
    console.log("Logging in user with " + this.state.uname +
        ", and password " + this.state.pwd);
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
      React.DOM.div( {className:"login"}, 
        React.DOM.form(null, 
        React.DOM.ul(null, 
          React.DOM.li(null, React.DOM.input( {type:"text", id:"username", placeholder:"username here",
                     onChange:this.onChange} )),
          React.DOM.li(null, React.DOM.input( {type:"password", id:"password", placeholder:"password here",
                     onChange:this.onChange} )),
          React.DOM.li(null, React.DOM.input( {type:"button", id:"login", value:"Login",
            onClick:this.handleSubmit, onTouchEnd:this.handleSubmit} ))
        )
        ),
        React.DOM.div(null, 
          React.DOM.a( {onClick:this.toggleLoginReg, onTouchEnd:this.toggleLoginReg}, "not a user yet? register here")
        )
      )
    );
  }
});
React.renderComponent(LoginForm(null ), document.getElementById("login"));

// post list
var PostList = React.createClass({displayName: 'PostList',
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
    Interloper.setDirty();
  },
  manageBlock : function(e){
     this.refs.mask.getDOMNode().className = "showMask";
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
     });
     this.refs.mask.getDOMNode().className = "hideMask";
  },
  openConversation : function(e){
     this.refs.mask.getDOMNode().className = "showMask";
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
     this.refs.mask.getDOMNode().className = "hideMask";
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
  toggleMask : function(e){
    if(e.target.className == "hideMask"){
       e.target.className = "showMask";
    }else{
       e.target.className = "hideMask";
       this.setState({
              items: this.state.items,
              searchText : this.state.searchText,
              blocked: this.state.blocked,
              blocklistVisibility: 'none',
              conversationItems: this.state.conversationItems,
              conversationTopic: this.state.conversationTopic,
              conversationVisible : "convoWindow topicInvisible"
            });
       React.Children.forEach(this.props.children, function(child){
           if(child.typeOf("BlockList") != -1){
                var style = { display: 'none' };
                child.getDOMNode().style = style;
           }
           if(child.typeOf("ConversationWindow") != -1){
             child.className = "convoWindow topicInvisible";
           }
       })
    }

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
      return React.DOM.div( {className:"postItem", key:item.hash, ref:"postList"}, React.DOM.a( {id:item.hash} ),
                      React.DOM.div( {dangerouslySetInnerHTML:{
                           __html : converter.makeHtml(decodeURI(item.postContent).replace(/&/g, "&amp;").replace(/</g, "&lt;") + " " + anchorMarkup)
                      }} ),
                      React.DOM.div(null, 
                        React.DOM.span( {className:"smalltext"}, item.user, " ( ", React.DOM.a( {href:"javascript://noscript;", onClick:this.manageBlock, onTouchEnd:this.manageBlock, alt:item.user}, "manage"), " |",
                                                                  React.DOM.a( {href:"javascript://noscript;", onClick:this.blockUser, onTouchEnd:this.blockUser, alt:item.user},  " block"), " )"+' '+
                         "- ", itemDateTime, " - ", React.DOM.a( {href:"javascript://noscript;", onClick:this.openConversation, onTouchEnd:this.openConversation, alt:JSON.stringify(item)}, conversationIndication))
                      )
                    );
    };
    var createConvoItem = function(item){
          var getDateTime = function(timeEpoch){
            var d = new Date(0);
            d.setUTCMilliseconds(timeEpoch);
            return d.toLocaleString();
          }
          var itemDateTime = getDateTime(item.time);
          return React.DOM.div( {className:"postItem", key:item.hash, ref:"postList"}, 
                          React.DOM.div( {dangerouslySetInnerHTML:{
                               __html : converter.makeHtml(decodeURI(item.postContent).replace(/&/g, "&amp;").replace(/</g, "&lt;"))
                          }} ),
                          React.DOM.div(null, 
                            React.DOM.span( {className:"smalltext"}, item.user, " - ", itemDateTime)
                          )
                        );
        };
    return (
      React.DOM.div(null, 
      React.DOM.div( {id:"searchBox"}, 
        React.DOM.input( {id:"searchBoxInput", placeholder: " Filter", onChange:this.onChange, ref:"search"} )
      ),
      React.DOM.div( {id:"opaqueMask", className:"hideMask", ref:"mask", onClick:this.toggleMask, onTouchEnd:this.toggleMask}),
      React.DOM.div( {className:"postList"}, 
        this.state.items.map(createItem.bind(this))
      ),
      BlockList( {items:this.state.blocked,
                 display:this.state.blocklistVisibility,
                 onHide:this.hideBlockList} ),
      ConversationWindow( {items:this.state.conversationItems,
                          topic:this.state.conversationTopic,
                          createItem:createConvoItem,
                          convoVisible:this.state.conversationVisible,
                          onHide:this.hideConvo,
                          update:this.updateConvo} )
      )
      );
    }
});
// block list window
var BlockList = React.createClass({displayName: 'BlockList',
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
        return React.DOM.li( {className:"userBlockItem", key:index}, React.DOM.a( {href:"javascript://noscript;", onClick:this.onClick, onTouchEnd:this.onClick, alt:unblockText, ref:item}, unblockText))
      };
      var blockListStyle = { display: this.props.display };
      return (
        React.DOM.div( {className:"blockList", ref:"blocklist", style:blockListStyle}, 
          React.DOM.p( {onClick:this.closeBlockList, onTouchEnd:this.closeBlockList}, "X"),
          React.DOM.ul( {className:"userBlockList"}, 
            this.props.items.map(createUserFromList.bind(this))
          )
        )
      )
  }
});
// conversation window
var ConversationWindow = React.createClass({displayName: 'ConversationWindow',
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
         React.DOM.div( {className:this.props.convoVisible, ref:"convo"}, 
            React.DOM.p( {className:"closeP", onClick:this.props.onHide, onTouchEnd:this.props.onHide}, "X"),
            React.DOM.div( {className:"topicMessage"}, 
               React.DOM.div( {dangerouslySetInnerHTML:{
                    __html : converter.makeHtml(decodeURI(this.props.topic.postContent).replace(/&/g, "&amp;").replace(/</g, "&lt;"))
               }} ),
               React.DOM.div(null, 
                 React.DOM.span( {className:"smalltext"}, this.props.topic.user, " - ", getDateTime(this.props.topic.time))
               )
            ),
            React.DOM.div( {className:"convoPost"}, 
               React.DOM.p(null, React.DOM.textarea( {id:"postBox", placeholder:"Your reply here", ref:"reply"} )),
               React.DOM.p(null, React.DOM.input( {type:"button", value:"Reply!", onClick:this.handleSubmit, onTouchEnd:this.handleSubmit} ))
            ),
            React.DOM.div( {className:"convoReplies"}, 
               this.props.items.map(this.props.createItem.bind(this))
            )
         )
      )
    }
});
React.renderComponent(PostList( {pollInterval:2000} ), document.getElementById("posts"));
