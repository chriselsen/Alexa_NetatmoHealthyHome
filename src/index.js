var fs, configurationFile;

configurationFile = 'config.json';
fs = require('fs');

var config = JSON.parse(
    fs.readFileSync(configurationFile)
);

/**
 * App ID for the skill
 */
var APP_ID = config.AlexaAppID;

/**
 * The AlexaSkill prototype and helper functions
 */
var AlexaSkill = require('./AlexaSkill');

/**
 * HealthyHome is a child of AlexaSkill.
 * To read more about inheritance in JavaScript, see the link below.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Introduction_to_Object-Oriented_JavaScript#Inheritance
 */
var HealthyHome = function () {
    AlexaSkill.call(this, APP_ID);
};

// Extend AlexaSkill
HealthyHome.prototype = Object.create(AlexaSkill.prototype);
HealthyHome.prototype.constructor = HealthyHome;

HealthyHome.prototype.eventHandlers.onSessionStarted = function (sessionStartedRequest, session) {
    console.log("HealthyHome onSessionStarted requestId: " + sessionStartedRequest.requestId
        + ", sessionId: " + session.sessionId);
    // any initialization logic goes here
};

HealthyHome.prototype.eventHandlers.onLaunch = function (launchRequest, session, response) {
    console.log("HealthyHome onLaunch requestId: " + launchRequest.requestId + ", sessionId: " + session.sessionId);
    var speechOutput = "Welcome to your Healthy Home. You can ask me about your home measurements.";
    var repromptText = "You can say: What's the temperature?";
    response.ask(speechOutput, repromptText);
};

HealthyHome.prototype.eventHandlers.onSessionEnded = function (sessionEndedRequest, session) {
    console.log("HealthyHome onSessionEnded requestId: " + sessionEndedRequest.requestId
        + ", sessionId: " + session.sessionId);
    // any cleanup logic goes here
};

HealthyHome.prototype.intentHandlers = {
    // register custom intent handlers
    "HealthyHomeTemperatureIntent": function (intent, session, response) {
        netatmoHealthyHomeValue("Temp", response);
    },
    "HealthyHomeMinTemperatureIntent": function (intent, session, response) {
        netatmoHealthyHomeValue("MinTemp", response);
    },
    "HealthyHomeMaxTemperatureIntent": function (intent, session, response) {
        netatmoHealthyHomeValue("MaxTemp", response);
    },
    "HealthyHomePressureIntent": function (intent, session, response) {
        netatmoHealthyHomeValue("Pressure", response);
    },
    "HealthyHomeHumidityIntent": function (intent, session, response) {
        netatmoHealthyHomeValue("Humidity", response);
    },
    "HealthyHomeCOOIntent": function (intent, session, response) {
        netatmoHealthyHomeValue("CO2", response);
    },
    "AMAZON.HelpIntent": function (intent, session, response) {
        response.ask("You can ask me about your home measurements, such as the temperature!", "You can ask me about your home measurements, such as the temperature!");
    }
};

function netatmoHealthyHomeValue(value, response) {
    netatmoGetAuthKey(function (AuthKey) { 
        netatmoGetValue(AuthKey, function (Data) {
            var jsonContent = JSON.parse(Data);
            switch(value){
                case "Temp": 
                    response.tell("The current temperature is " + jsonContent.dashboard_data.Temperature + " degrees celsius and is trending " + jsonContent.dashboard_data.temp_trend + ".");
                    break;
                case "MinTemp": 
                    response.tell("The minimum temperature was " + jsonContent.dashboard_data.min_temp + " degrees celsius within the past 24 hours.");
                    break;    
                case "MaxTemp": 
                    response.tell("The maximum temperature was " + jsonContent.dashboard_data.max_temp + " degrees celsius within the past 24 hours.");
                    break;    
                case "Pressure": 
                    response.tell("The current pressure is " + jsonContent.dashboard_data.Pressure + " millibar and is trending " + jsonContent.dashboard_data.pressure_trend + ".");
                    break;
                case "Humidity": 
                    response.tell("The current relative humidity is " + jsonContent.dashboard_data.Humidity + " percent.");
                    break;
                case "CO2": 
                    response.tell("The current CO2 concentration is " + jsonContent.dashboard_data.CO2 + " parts per million.");
                    break;    
                default:
                    response.tell("Sorry, this value is unknown.");
            }
        });
    });
}

function netatmoGetAuthKey(callback) {
    var https = require('https');
    var querystring = require('querystring');
    
    var post_data = querystring.stringify({
        'grant_type' : 'password',
        'client_id' : config.NetatmoClientID,
        'client_secret' : config.NetatmoClientSecret,
        'username' : config.NetatmoUsername,
        'password' : config.NetatmoPassword,
        'scope' : 'read_homecoach'
    });

  
    var post_options = {
        hostname: 'api.netatmo.com',
        port: '443',
        path: '/oauth2/token',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
            'Content-Length': Buffer.byteLength(post_data)
        }
    };


    var post_req = https.request(post_options, function(res) {
        res.setEncoding('utf8');
 
        res.on('data', function (chunk) {
            var jsonContent = JSON.parse(chunk);
            console.log('Access Token: ' + jsonContent.access_token);
            callback(jsonContent.access_token);
        });
    });
    
    post_req.write(post_data);
    post_req.end();
    
    post_req.on('error', (e) => {
        console.error(e);
    });
}

function netatmoGetValue(authKey, callback) {
    var https = require('https');
    
    var endpoint = 'https://api.netatmo.com/api/gethomecoachsdata';
    var deviceID = config.NetatmoDeviceID;
	var queryString = '?access_token=' + authKey + '&device_id=' + deviceID;

	https.get(endpoint + queryString, function (res) {
        res.on('data', function (data) {
		    var jsonContent = JSON.parse(data);
		    console.log('Data: ' + JSON.stringify(jsonContent.body.devices[0]));
		    callback(JSON.stringify(jsonContent.body.devices[0]));
        });
	}).on('error', (e) => {
        console.error(e);
    });
}

// Create the handler that responds to the Alexa Request.
exports.handler = function (event, context) {
    // Create an instance of the HealthyHome skill.
    var helloWorld = new HealthyHome();
    helloWorld.execute(event, context);
};
