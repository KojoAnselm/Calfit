/*
 * Copyright (c) Microsoft All rights reserved. Licensed under the MIT license.
 * See LICENSE in the project root for license information.
 Edited by: Spurrya Jaggi
 */

var request = require('request');
var Q = require('q');
var gcm = require('node-gcm');
var message = new gcm.Message();


// The graph module object.
var graph = {};
var regTokens = ['597929500512'];
//GCM Api key
var sender = new gcm.Sender('AIzaSyBAIqiMZOgr5hpgGzxGAtdkIs-Go8pqAZE');


// @name getUsers
// @desc Makes a request to the Microsoft Graph for all users in the tenant.
graph.getUsers = function (token) {
  var deferred = Q.defer();

  // Make a request to get all users in the tenant. Use $select to only get
  // necessary values to make the app more performant.
  request.get('https://graph.microsoft.com/v1.0/users?$select=id,displayName', {
    'auth': {
      'bearer': token
    }
  }, function (err, response, body) {
    var parsedBody = JSON.parse(body);

    if (err) {
      deferred.reject(err);
    } else if (parsedBody.error) {
      deferred.reject(parsedBody.error.message);
    } else {
      // The value of the body will be an array of all users.
      deferred.resolve(parsedBody.value);
    }
  });

  return deferred.promise;
};

// @name createEvent
// @desc Creates an event on each user's calendar.
// @param token The app's access token.
// @param users An array of users in the tenant.
graph.createEvent = function (token, users) {
  for (var i = 0; i < users.length; i++) {
    // The new event will be 30 minutes and take place tomorrow at the current time.
    var startTime = new Date();
    startTime.setDate(startTime.getDate() + 1);
    var endTime = new Date(startTime.getTime() + 30 * 60000);

    // These are the fields of the new calendar event.
    var newEvent = {
      Subject: 'Microsoft Graph API discussion',
      Location: {
        DisplayName: "Joe's office"
      },
      Start: {
        'DateTime': startTime,
        'TimeZone': 'PST'
      },
      End: {
        'DateTime': endTime,
        'TimeZone': 'PST'
      },
      Body: {
        Content: 'Let\'s discuss this awesome API.',
        ContentType: 'Text'
      }
    };

    // Add an event to the current user's calendar.
    request.post({
      url: 'https://graph.microsoft.com/v1.0/users/' + users[i].id + '/events',
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer ' + token,
        'displayName': users[i].displayName
      },
      body: JSON.stringify(newEvent)
    }, function (err, response, body) {
      if (err) {
        console.error('>>> Application error: ' + err);
      } else {
        var parsedBody = JSON.parse(body);
        var displayName = response.request.headers.displayName;

        if (parsedBody.error) {
          if (parsedBody.error.code === 'RequestBroker-ParseUri') {
            console.error('>>> Error creating an event for ' + displayName  + '. Most likely due to this user having a MSA instead of an Office 365 account.');
          } else {
            console.error('>>> Error creating an event for ' + displayName  + '.' + parsedBody.error.message);
          }
        } else {
          console.log('>>> Successfully created an event on ' + displayName + "'s calendar.");
        }
      }
    });
  }
};

graph.getEvents = function (token , users, res) {
  var deferred = Q.defer();
  request.get('https://graph.microsoft.com/v1.0/users/958c3530-8ea4-43b9-bb0e-5f168f82aff3/calendar/events', {
    'auth': {
      'bearer': token
    }
  }, function (err, response, body) {
    var parsedBody = JSON.parse(body);

    if (err) {
      deferred.reject(err);
    } else  {
      var value = JSON.parse(response.body).value;
      var updatedValue =[]
      value.forEach(function(calItem){
        var obj ={
          start : calItem.start,
          end : calItem.end
        };

        updatedValue.push(obj);
      });
       res.json({events: updatedValue})
    }
  });

  return deferred.promise;
};

graph.pushNotification = function(){
  var message = new gcm.Message();
  message.addData('key1', 'msg1');
  sender.send(message, { registrationTokens: regTokens }, function (err, response) {
      if(err) console.error(err);
      else    console.log(response);
  });
}

module.exports = graph;
