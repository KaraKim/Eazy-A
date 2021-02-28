/* *
 * This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
 * Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
 * session persistence, api calls, and more.
 * */
const Alexa = require('ask-sdk-core');
var fs = require('fs');
var google = require('googleapis');
var clientSecretsFile = 'client_secret.json';
var GoogleAuth = require('google-auth-library');

function EditFileFunction (intent, session, response) {
  var accessToken = JSON.stringify(session.user)
  console.log("accessToken: " + accessToken)
  var name = intent.slots.fileName.value;
  var inputString = "hi";
  fs.readFile(clientSecretsFile.toString(), function processClientSecrets (err, content) {
    if (err) {
      console.log('Error Loading client secret file: ' + err)
      var secretsError = 'There was an issue reaching the skill'
      return secretsError
    } else {
      authorize(JSON.parse(content), accessToken, function (err, oauthClient) {
        if (err) {
          var noOauth = 'You must have a linked account to use this skill. Please use the alexa app to link your account.'
          return noOauth
        }
        searchFile(oauthClient, name, function (err, id) {
          if (err) {
            return "Could not find the file"
          }
          exportFile(oauthClient, id, function (err, fileText) {
            if (err) {
              return "Could not export file"
            }
            updateFileNoMD(oauthClient, id, fileText, function (err, updatedFile) {
              if (err) {
                return "Could not update file"
              }
              var fileUpdated = 'We updated the file named ' + updatedFile + ' with your input of ' + inputString
              return fileUpdated
            })
          })
        })
      })
    }
  })
}

// function getFileContent (intent, fileName, session, response) {
//   var accessToken = JSON.stringify(session.user.accessToken);
//   console.log("This is the access token" + accessToken);
//   fs.readFile(clientSecretsFile.toString(), function processClientSecrets (err, content) {
//       authorize(JSON.parse(content), accessToken, function (err, oauthClient) {
//           searchFile(oauthClient, fileName, function (err, id) {
//           });
//       });
//   });
// }

function updateFileNoMD (auth, id, file, callback) {
  var service = google.drive('v3')
  service.files.update({
    fileId: id,
    media: {
      mimeType: 'text/plain',
      body: file
    },
    auth: auth
  }, function (err, response) {
    if (err) {
      return callback(err)
    }
    return callback(null, response.name)
  })
}

function exportFile (auth, id, callback) {
  var service = google.drive('v3')
  service.files.export({
    fileId: id,
    mimeType: 'text/plain',
    auth: auth
  }, function (err, response) {
    if (err) {
      return callback(err)
    }
    return callback(null, response)
  })
}

function authorize (credentials, token, callback) {
  var clientSecret = credentials.web.client_secret
  var clientId = credentials.web.client_id
  var redirectUrl = credentials.web.redirect_uris[0]
  var auth = new GoogleAuth()
  var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl)
  // Check if we have previously stored a token
  oauth2Client.setCredentials({
    access_token: token
  })
  if (token === undefined) {
    var undefinedToken = 'Token is undefined, please link the skill'
    return callback(undefinedToken)
  }
  return callback(null, oauth2Client)
}

function searchFile (auth, name, callback) {
  var service = google.drive('v3')
  var fileName = 'name contains ' + "'" + name + "'"
  service.files.list({
    auth: auth,
    q: fileName,
    fields: 'nextPageToken, files(id, name)',
    spaces: 'drive'
  }, function (err, res) {
    if (err) {
        // console.log("ERRRRORRRRRRR " + err);
      var errMsg = 'There was an error finding the file, please try again'
      return callback(errMsg)
    } else if (res.files.length > 1) {
      // Occurs when more than one file is found
      // This is to prevent the user from updating
      // all files found in the search and limit it to one
      var tooMany = 'We found more than one file,  Try to be more specific with the file name'
      return callback(tooMany)
    } else if (res.files.length < 1) {
      var noFileFound = 'There were no files that matched this inquiry'
      return callback(noFileFound)
    } else {
      var file = res.files[0]
      return callback(null, file.id)
    }
  })
}

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speakOutput = 'Welcome to Eazy-A, Sam! What would you like to study today?';
        const attributesManager = handlerInput.attributesManager;  
        const attributes = attributesManager.getSessionAttributes();
        attributes.visted = 0;  
        attributesManager.setSessionAttributes(attributes); 
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const openFileIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'openFileIntent';
    },
    handle(handlerInput) {
        var documentName =  handlerInput.requestEnvelope.request.intent.slots.fileName.value;
        EditFileFunction(handlerInput.requestEnvelope.request.intent, handlerInput.requestEnvelope.context.System, handlerInput.responseBuilder);
        const speakOutput = 'The file you want to be tested on is: ' + documentName + ". Is this correct?";

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const YesIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'yesIntent';
    },
    handle(handlerInput) {
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        if (attributes.visted === 0) {
            const speakOutput = 'Great! Give me a moment to create the review questions… Okay. Are you ready?';
            attributes.visted = 1;
            handlerInput.attributesManager.setSessionAttributes(attributes); 
            return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
        } else {
            const speakOutput = 'Question 1: Which continent is Mongolia in? Is it,' + 
            'a) Australia, b) North America, c) Asia, or d) Europe?';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
            
        }
    }
};

const ContinentIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'continentIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'Nice try! The correct answer is c) Asia. Question 2: True, or False? Niagara Falls is in Canada.';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const TrueFalseIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'TrueFalseIntent';
    },
    handle(handlerInput) {
        const speakOutput = "Correct! Question 3: Name the key term that refers to a mountain or hill " +
        "with a crater which lava, rock fragments, hot vapor, and gas are being or have erupted from the earth's crust.";
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const VolcanoIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'volcanoIntent';
    },
    handle(handlerInput) {
        const speakOutput = "Correct! You got 2 out of 3 correct. Well done! Eazy-A. Study smart with Alexa";
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};



const HelloWorldIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'HelloWorldIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'Hello World!';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'You can say hello to me! How can I help?';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speakOutput = 'Goodbye!';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};
/* *
 * FallbackIntent triggers when a customer says something that doesn’t map to any intents in your skill
 * It must also be defined in the language model (if the locale supports it)
 * This handler can be safely added but will be ingnored in locales that do not support it yet 
 * */
const FallbackIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'Sorry, I don\'t know about that. Please try again.';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};
/* *
 * SessionEndedRequest notifies that a session was ended. This handler will be triggered when a currently open 
 * session is closed for one of the following reasons: 1) The user says "exit" or "quit". 2) The user does not 
 * respond or says something that does not match an intent defined in your voice model. 3) An error occurs 
 * */
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`~~~~ Session ended: ${JSON.stringify(handlerInput.requestEnvelope)}`);
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse(); // notice we send an empty response
    }
};
/* *
 * The intent reflector is used for interaction model testing and debugging.
 * It will simply repeat the intent the user said. You can create custom handlers for your intents 
 * by defining them above, then also adding them to the request handler chain below 
 * */
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};
/**
 * Generic error handling to capture any syntax or routing errors. If you receive an error
 * stating the request handler chain is not found, you have not implemented a handler for
 * the intent being invoked or included it in the skill builder below 
 * */
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        const speakOutput = 'Sorry, I had trouble doing what you asked. Please try again.';
        console.log(`~~~~ Error handled: ${JSON.stringify(error)}`);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

/**
 * This handler acts as the entry point for your skill, routing all request and response
 * payloads to the handlers above. Make sure any new handlers or interceptors you've
 * defined are included below. The order matters - they're processed top to bottom 
 * */
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        openFileIntentHandler,
        YesIntentHandler,
        ContinentIntentHandler,
        TrueFalseIntentHandler,
        VolcanoIntentHandler,
        HelloWorldIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        FallbackIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler)
    .addErrorHandlers(
        ErrorHandler)
    .withCustomUserAgent('sample/hello-world/v1.2')
    .lambda();