
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var net = require('net');
var _ = require('underscore');
var events = require('events');

var log = require('./modules/log')(module);
var logInput = require('./modules/logInput')(module);
var config = require('./modules/config');
var parser = require('./modules/parsing/parser');

/**
 * Function to run gps-server outside.
 *
 * @returns {events.EventEmitter} provides 'extension point' for handling GPS data outside.
 */
module.exports = function() {

    var em = new events.EventEmitter();

//  =========   Express endpoints
    app.use(express.static(__dirname + '/public'));//must be absolute path to the directory with static resources, to work correctly in both modes: as standalone app and as npm_module.
    app.get('/', function (req, res) {
        res.sendFile(__dirname + '/public/map.html'); // NOTE: but index.html always has priority, and rendered instead..
    });

//  =========   Messaging
    io.on('connection', function (socket) {

        //console.log('a user connected');
        log.info('socket.io connected');

        socket.on('disconnect', function () {
            //console.log('user disconnected');
            log.info('socket.io disconnected');
        });

        /*
         //    @see http://socket.io/get-started/chat/
         Here are some ideas to improve the application:

         Broadcast a message to connected users when someone connects or disconnects
         Add support for nicknames
         Don’t send the same message to the user that sent it himself. Instead, append the message directly as soon as he presses enter.
         Add “{user} is typing” functionality
         Show who’s online
         Add private messaging
         */
        socket.on('map message', function (msg) {
            //console.log('map message: ' + msg );
            //console.log('map message: ' + msg.type + ' text: ' + msg.text + ' lat: ' + msg.lat + ' lng: ' + msg.lng );
            log.info('map message: ' + msg);

            io.emit('map message', msg);
        });

    });

//  TODO    extend HTTP configuration with ENV & default value
//  =========   HTTP
    var portHttp = config.get('http:port');
    http.listen(portHttp, function () {
        var serverAddress = http.address();
        log.info('HTTP listening on ' + serverAddress.family + ' ' + serverAddress.address + ':' + serverAddress.port + ' - UI is available in browser'); // TODO: put 'UI disabled' if config.ui.disabled
    });

//  TODO    extend TCP configuration with ENV & default value
//  TODO    config TCP in RH cloud, on the same 8080 port ?
//  =========   TCP
    var tcpInputEncoding = config.get('tcp:input_log_encoding') || 'ascii';
    log.debug('TCP config: input_log_encoding: ' + tcpInputEncoding);
    var tcpIdleTimeout = config.get('tcp:idle_timeout') || 30000; // 30 secs if other not configured
    log.debug('TCP config: idle_timeout: ' + tcpIdleTimeout);
    var portTcp = config.get('tcp:port');
    var tcp = net.createServer(function (socket) {

        var client = 'host ' + socket.remoteAddress + ':' + socket.remotePort;
        log.info('TCP connected ' + client);

        // releasing idling resources
        socket.setTimeout(tcpIdleTimeout, function () {
            log.debug('TCP socket destroyed after idling for ' + tcpIdleTimeout + ' millis');
            socket.destroy();
        });

        tcp.getConnections(function (err, count) {
            if (err) {
                log.error('ERROR on counting active TCP connections');
                return;
            }
            //server.maxConnections # Set this property to reject connections when the server's connection count gets high.
            log.info('TCP active connections: ' + count);// + ' of max: ' + tcp.maxConnections); // undefined
        });

        /**
         * Procession of received data.
         *
         * @param {Buffer} buffer - raw binary data of Buffer type.
         */
        socket.on('data', function (buffer) {
            //log.info( 'tcp ' + client + '  passed data:\n' + buffer );
            log.info('TCP got data from ' + client);
            //log.info( 'TCP got data on socket: ' + socket ); // TODO: debug socket.IMEI value
            //log.info( 'TCP got data on socket: ' + JSON.stringify( socket.address() ) );

            try {
                logInput.info( buffer.toString( tcpInputEncoding ) ); // saving data input -> into a file.
            } catch (ex) {
                log.error('file logging failure: ' + ex);
            }

            //  process data packet
            var parsedData = parser.parse(socket, buffer); // (buffer instanceof Buffer) == true
            //log.debug( 'parsed data:\n' + parsedData); //TODO: stringify parsed results.

            if (!parsedData) {	//	null || undefined
                log.error("Data wasn't parsed. Connection dropped.");
                socket.destroy(); //  release socket resources
                return;
            }

            var parsedMaps; // expected format - Array of Maps with extracted data values.
            if (_.isArray(parsedData)) {
                if (parsedData.length == 0) { // empty Array
                    log.info('Connection still opened, looking for next data packet.');
                    return;
                }
                parsedMaps = parsedData;
            }

            if (!parsedMaps) {
                log.error("Can't process parsed data. Connection dropped.");
                socket.destroy();
                return;                //  TODO:   keep connection opened, as there may be additional data ?
            }

            //  data packet fully processed.
            //  release socket asap.
            socket.end();

            try {
                //  TODO:   use 'ui:enabled' config option

                //  update UI in real-time
                //  TODO:   don't pass EVERY of coords to UI, but only LAST / LATEST one.
                for (var index = 0; index < parsedMaps.length; index++)
                {
                    var mapData = parsedMaps[index];
                    var deviceId = mapData['IMEI'];

                    if (deviceId) {
                        //  utcDate,utcTime
                        var utcDateTime = mapData['utcDateTime'];
                        //var utcDate = mapData['utcDate'];
                        //var utcTime = mapData['utcTime'];
                        //var utcDate = new Date(mapData['utcDate']);
                        //var utcTime = new Date(mapData['utcTime']);
                        //var utcDateTime = new Date(parseInt(mapData['utcDate']) + parseInt(mapData['utcTime']));
                        //log.debug('date: ' + utcDate + ' time: ' + utcTime);
                        //log.debug('date & time as Date: ' + utcDateTime); // OUTPUT: date & time as Date: 1377818379000
                        //log.debug('date&time as String: ' + utcDateTime.toString()); // the same !

                        var lat = mapData['latitude'];
                        var lng = mapData['longitude'];

                        var objUI = {
                            type: 'marker',
                            deviceId: deviceId,
                            utcDateTime: new Date(utcDateTime).toUTCString(),
                            altitude: mapData['altitude'], // Unit: meter
                            speed: mapData['speed'], // unit: km/hr
                            //speedKnots: mapData['speedKnots'], // unit: Knots
                            heading: mapData['heading'], // unit: degree
                            //reportType: mapData['reportType'], - see: tr-600_development_document_v0_7.pdf -> //4=Motion mode static report //5 = Motion mode moving report //I=SOS alarm report //j= ACC report
                            lat: lat,
                            lng: lng
                        };
                        io.emit('map message', objUI); // broadcasting using 'emit' to every socket.io client
                        log.debug('gps position broadcasted -> map UI');
                    }
                }
            } catch (ex) {
                log.error('UI update failure: ' + ex);
            }

            //  announce GPS data events, as part of 'extension point' to be used outside
            em.emit('gps_data', parsedMaps);
            em.emit('gps_data_tcp', parsedMaps);
        });

        socket.on('close', function () {
            log.info('TCP disconnected ' + client);
        });

        socket.on('error', function (err) {
            log.error('TCP: ', err);
        });

    }).listen(portTcp, function () {
        var serverAddress = tcp.address();
        log.info('TCP  listening on ' + serverAddress.family + ' ' + serverAddress.address + ':' + serverAddress.port);
    });

    return em; // instance of EventEmitter, to use it outside.

}