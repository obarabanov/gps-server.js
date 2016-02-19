
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var net = require('net');
var _ = require('underscore');

//var logger = require('morgan');
var log = require('./modules/log')(module);
var logInput = require('./modules/logInput')(module);
var config = require('./modules/config');
var parser = require('./modules/parser');

//  =========   Express endpoints
//app.use(logger('dev')); // выводим все запросы со статусами в консоль
app.use(express.static('public'));

app.get('/', function(req, res){
  //res.send('<h1>Hello world</h1>');
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
http.listen(portHttp, function(){
  log.info('HTTP listening on *:' + portHttp);
});

//  TODO    extend TCP configuration with ENV & default value
//  TODO    config TCP in RH cloud, on the same 8080 port ?
//  =========   TCP
var portTcp = config.get('tcp:port'); // 8888
var tcp = net.createServer( function(socket) {

    var client = 'host ' + socket.remoteAddress + ':' + socket.remotePort;
    log.info('TCP connected ' + client);

    //	don't convert, data should be kept as Buffer (binary).
	//socket.setEncoding('utf8'); // to convert Buffer -> String

    tcp.getConnections(function(err, count) {
        if (err) {
            //console.log('ERROR of counting active TCP connections');
            //log.error('Internal error(%d): %s',res.statusCode,err.message);
            log.error('ERROR of counting active TCP connections');
            return;
        }
        //server.maxConnections # Set this property to reject connections when the server's connection count gets high.
        //console.log('TCP active connections: ' + count );// + ' of max: ' + tcp.maxConnections); // undefined
        log.info( 'TCP active connections: ' + count );
    });

    /**
     * Procession of received data.
     *
     * @param {Buffer} data - raw binary data of Buffer type.
     */
    socket.on('data', function(data)
    {
        //log.info( 'tcp ' + client + '  passed data:\n' + data );
        log.info( 'TCP got data from ' + client );
        //log.info( 'TCP got data on socket: ' + socket ); // TODO: debug socket.IMEI value
        //log.info( 'TCP got data on socket: ' + JSON.stringify( socket.address() ) );
        logInput.info( '' + data ); // saving input -> into a file.

        //log.debug( 'data instanceof Buffer ? ' + (data instanceof Buffer) );
        //log.debug( 'is data of String type ? ' + _.isString(data) );

        /*
         TODO:
         parser adapters support
         detect input type data
         add support for BiTrek devices *without* DB usage
         */

        //  process data packet
        var parsedData = parser.parse(socket, data); // (data instanceof Buffer) == true
        //log.debug( 'parsed data:\n' + parsedData); //TODO: stringify parsed results.

        if (!parsedData) {	//	null || undefined
            log.error( "Data wasn't parsed. Procession stopped." );
            //  release socket resources
            socket.destroy();
            return;
        }

        //  TODO:   push return types & socket handlings down, under -> parser ?

        if (_.isString(parsedData) && (parsedData == 'connection initialized')) {
            log.info('Socket connection initialized. Waiting for data from device.');
            return;
        }

        var parsedMaps;
        if (_.isArray(parsedData)) {
            parsedMaps = parsedData;
        }

        if (!parsedMaps) {
            log.error('Wrong parsed data format. Procession stopped.');
            //  keep connection opened, as there may be additional data ?
            return;
        }

        for (var index in parsedMaps) // this approach is safe, in case parsedMaps == null.
        {
            var mapData = parsedMaps[ index ];
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
                    utcDateTime: new Date( utcDateTime).toUTCString(),
                    altitude: mapData['altitude'], // Unit: meter
                    speed: mapData['speed'], // unit: km/hr
                    //speedKnots: mapData['speedKnots'], // unit: Knots
                    heading: mapData['heading'], // unit: degree
                    //reportType: mapData['reportType'], - see: tr-600_development_document_v0_7.pdf -> //4=Motion mode static report //5 = Motion mode moving report //I=SOS alarm report //j= ACC report
                    lat: lat,
                    lng: lng
                };
                io.emit( 'map message', objUI ); // broadcasting using 'emit' to every socket.io client
                log.debug('gps position broadcasted -> map UI');
            }
        }

        //  data packet fully processed.
        socket.end();

    });

    socket.on('close', function() {
        log.info( 'TCP disconnected ' + client );
    });

    socket.on('error', function( err ) {
        log.error('TCP: ', err);
    });

    /*
    socket.on('connect', function() {
        var hex = 0x01;
        var buff = new Buffer( 1);
        buff.writeUInt8(hex, 0);

        socket.write( buff, function() {
            console.log( buff, 'flushed');
        });
    });
    */

}).listen( portTcp, function() {
    log.info( 'TCP  listening on *:' + portTcp );
});
