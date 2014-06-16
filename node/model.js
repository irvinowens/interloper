/**
* The Interloper model
*/

var Dao = require('./dao');

// We should be able to create a new user
exports.createUser = function(userName, ipAddress, password, cb){
  Dao.q("INSERT INTO interloper.users (user_id, password, username, user_ip) " +
            "VALUES (?,SHA2(?,512),?,?)",
            [ exports.randomUUID(), password, userName, ipAddress ], function(err, rows){
              if(err){
                console.error("There was an error creating the user " +
                userName + " with IP Address " + ipAddress +
                " the error is " + err.stack);
                cb(-1);
              }
              cb(rows);
            });
}
// We need to be able to check to see if a user exists
exports.userExist = function(userName, cb){
  Dao.q("SELECT user_id FROM interloper.users WHERE username = ?",
         [userName], function(err, rows){
           if(err){
             console.error("Something went wrong getting this user " + err.stack);
             cb(null);
           }
           if(rows.length > 0){
             cb(true);
           }else{
             cb(false);
           }
         });
}
// We should be able to delete a user
exports.userDelete = function(userName, cb){
   Dao.q("DELETE FROM interloper.users WHERE username = ?", [ userName ], function(err, rows){
     if(err){
       console.error("There was a problem deleting the user from the DB " + err.stack);
       cb(null);
     }
     console.log("User " + userName + " deleted successfully");
   });
}
// We need to be able to get the user by user_id
exports.getUser = function(userId,cb){
  Dao.q("SELECT * FROM interloper.users WHERE user_id = ?",[ userId ], function(err, rows){
    if(err){
      console.error("There was an error while trying to get that user " + err.stack);
      cb(null);
    }
    if(rows.length == 0){
      console.log("That user did not exist");
      cb({})
    }
    cb(rows[0]);
  });
}
// Finally we need to be able to get all of the user ids
exports.getUsers = function(cb){
  Dao.q("SELECT user_id FROM interloper.users",null, function(err, rows){
    if(err){
      console.error("We couldn't get the users " + err.stack);
      cb(null);
    }
    cb(rows);
  });
}
// We need to get a list of user ids and ip addresses
exports.getUsersAndIps = function(cb){
  Dao.q("SELECT username, user_ip FROM interloper.users",null, function(err, rows){
    if(err){
      console.error("We couldn't retrieve the usernames & ips " + err.stack);
      cb(null);
    }
    cb(rows);
  });
}
// User login
exports.userLogin = function(username, password, cb){
  Dao.q("SELECT user_id, username FROM interloper.users WHERE password=SHA2(?,512) AND username=?",
            [ password, username ], function(err,rows){
            if(err){
              console.error("Couldn't verify this user")
              return false;
            }
      console.log("Login rows " + rows);
      if(rows.length == 0){
        cb(false);
      }else{
        cb(rows[0]);
      }
  });
}
/*-------------------------------- DAO LIBS ---------------------------------*/
/* randomUUID.js - Version 1.0
 *
 * Copyright 2008, Robert Kieffer
 *
 * This software is made available under the terms of the Open Software License
 * v3.0 (available here: http://www.opensource.org/licenses/osl-3.0.php )
 *
 * The latest version of this file can be found at:
 * http://www.broofa.com/Tools/randomUUID.js
 *
 * For more information, or to comment on this, please go to:
 * http://www.broofa.com/blog/?p=151
 */

/**
 * Create and return a "version 4" RFC-4122 UUID string.
 */
exports.randomUUID = function() {
  var s = [], itoh = '0123456789ABCDEF';

  // Make array of random hex digits. The UUID only has 32 digits in it, but we
  // allocate an extra items to make room for the '-'s we'll be inserting.
  for (var i = 0; i < 36; i++) s[i] = Math.floor(Math.random()*0x10);

  // Conform to RFC-4122, section 4.4
  s[14] = 4;  // Set 4 high bits of time_high field to version
  s[19] = (s[19] & 0x3) | 0x8;  // Specify 2 high bits of clock sequence

  // Convert to hex chars
  for (var i = 0; i < 36; i++) s[i] = itoh[s[i]];

  // Insert '-'s
  s[8] = s[13] = s[18] = s[23] = '-';

  return s.join('');
}
