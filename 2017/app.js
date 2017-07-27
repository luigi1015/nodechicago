'use strict';

// Node modules - Don't modify
var moment = require('moment');
var five = require("johnny-five");
var Protocol = require('azure-iot-device-amqp').Amqp;
var Client = require('azure-iot-device').Client;
var Message = require('azure-iot-device').Message;

// Setup - Don't modify
var board = new five.Board({
    io: new Particle({
        token: '[AccessToken]',
        deviceName: '[DeviceName]'
    })
})

var connectionString = '[Device Connection String from Command Line]';
var client = Client.fromConnectionString(connectionString, Protocol);
var currentaction = "offline";


board.on('ready', function () {
    letsPlay();
    var connectCallback = function (err) {
        if (err) {
            console.error('Could not connect: ' + err.message);
        } else {
            console.log('Client connected');

            client.on('error', function (err) {
                console.error(err.message);
            });

            client.on('disconnect', function () {
                clearInterval(sendInterval);
                client.removeAllListeners();
                client.open(connectCallback);
            });
        }
    };

    client.open(connectCallback);
});

function printResultFor(op) {
    return function printResult(err, res) {
        if (err) console.log(op + ' error: ' + err.toString());
        if (res) console.log(op + ' status: ' + res.constructor.name);
    };
}


function letsPlay() {
    var rightWheel = new five.Motor({ pins: [4, 12], invertPWM: true });
    var leftWheel = new five.Motor({ pins: [5, 14], invertPWM: true });
    var scalar = 256; // Friction coefficient
    var actioncounter = 0;
    var newcommand = "home()";
    var speed = 255;
    leftWheel.rev(0);
    rightWheel.rev(0);

    function actionSender() {
        var distance = 0;
        Math.round(actioncounter);
        if (currentaction == "fd" || currentaction == "bk") {
            var a = (moment.now() - actioncounter) * 0.18 * speed / scalar;
            newcommand = "" + currentaction + "(" + a + ")";
            distance = a;
        }
        else if (currentaction == "rt" || currentaction == "lt") {
            var a = (moment.now() - actioncounter) * 0.18 * speed / scalar;
            newcommand = "" + currentaction + "(" + a + ")";
            distance = 0;
        }
        else if (currentaction == "home") {
            newcommand = "home()";
            distance = 0;
        }
        else {
            newcommand = "fd(0)";
            distance = 0;
        };
        distance = distance.toString();
        var data = JSON.stringify({ deviceId: deviceID, command: newcommand, distance: distance });
        var message = new Message(data);
        console.log('Sending message: ' + message.getData());
        client.sendEvent(message, printResultFor('send'));
        actioncounter = moment.now();
    }

    ////////////////////////////////////////////////////////////////

    // Write your Johnny-Five code here!


    ///////////////////////////////////////////////////////////////

    // These functions are for stopping and moving the car with a little workaround specific to the Feather HUZZAH board and Johnny-Five. Leave these as they are.
    function forward() {
        leftWheel.fwd(speed);
        rightWheel.fwd(speed);
        currentaction = "fd";
        console.log("Forward!");
    }
    function stop() {
        leftWheel.rev(0); // This makes the car stop.
        rightWheel.rev(0);
        currentaction = "stopped";
        console.log("Stop!");
    }
    function left() {
        leftWheel.rev(speed);
        rightWheel.fwd(speed);
        currentaction = "lt";
        console.log("Left!");
    }
    function right() {
        leftWheel.fwd(speed);
        rightWheel.rev(speed);
        currentaction = "rt";
        console.log("Right!");
    }
    function reverse() {
        leftWheel.rev(speed);
        rightWheel.rev(speed);
        currentaction = "bk";
        console.log("Back!");
    }
    function exit() {
        currentaction = "offline";
        setTimeout(process.exit, 1000);
    }

    // This is the code for controlling car actions from the command line
    var keyMap = {
        'up': forward,
        'left': left,
        'right': right,
        'down': reverse,
        'space': stop,
        'q': exit
    };

    var stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on("keypress", function (chunk, key) {
        if (!key || !keyMap[key.name]) return;
        actionSender();
        keyMap[key.name]();
    });
}
