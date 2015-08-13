
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
var db = require('./modules/db');

//var clients = [];

//  =========   Express endpoints
//app.use(logger('dev')); // выводим все запросы со статусами в консоль
app.use(express.static('public'));

app.get('/', function(req, res){
  //res.send('<h1>Hello world</h1>');
  //res.sendFile(__dirname + '/public1/chat.html'); // works ok ! // NOTE: but index.html always has priority, and rendered instead..
  res.sendFile(__dirname + '/public/map.html'); 
});

app.get('/db', function(req, res) {
    
    var status = db.ping_db(); //  TODO: status is blank, wait for asynch queries procession
    res.send('<h3>DB status:</h3><br/>' + status);
    
});

//  =========   Messaging
io.on('connection', function(socket){
    
  //console.log('a user connected');
  log.info('socket.io connected');
  
  socket.on('disconnect', function(){
    //console.log('user disconnected');
    log.info('socket.io disconnected');
  });  
  
  /*
  //    TODO:   @see http://socket.io/get-started/chat/
Here are some ideas to improve the application:

    Broadcast a message to connected users when someone connects or disconnects
    Add support for nicknames
    DonТt send the same message to the user that sent it himself. Instead, append the message directly as soon as he presses enter.
    Add У{user} is typingФ functionality
    Show whoТs online
    Add private messaging   
    */
  socket.on('chat message', function(msg){
    console.log('chat message: ' + msg);
    io.emit('chat message', msg);
  });  
  
  socket.on('map message', function(msg){
    //console.log('map message: ' + msg );
    //console.log('map message: ' + msg.type + ' text: ' + msg.text + ' lat: ' + msg.lat + ' lng: ' + msg.lng );
    log.info('map message: ' + msg);
    
    io.emit('map message', msg);
  });  
  
});

//  =========   HTTP
var portHttp = config.get('http:port');
http.listen(portHttp, function(){
  log.info('HTTP listening on *:' + portHttp);
});

//  =========   TCP - tested OK !
var portTcp = config.get('tcp:port'); // 8888
var tcp = net.createServer( function(socket) {
    
    var client = 'host ' + socket.remoteAddress + ':' + socket.remotePort;
    log.info('TCP  connected ' + client);
    
    //	works without it, for String packets too.
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
	
    /*
    //  ???
    setTimeout(function () {
        socket.destroy();
    }, 20000);	
    */
   
	/*
    //socket.write('Welcome to the Telnet server!\n');
    socket.on('connect', function() {
        var hex = 0x01;
        var buff = new Buffer( 1);
        buff.writeUInt8(hex, 0);

        socket.write( buff, function() {
            console.log( buff, 'flushed');
        });		
    });
    */

    socket.on('data', function(data) 
	{
        log.info( 'tcp ' + client + '  passed data:\n' + data );
        logInput.info( '' + data );
		
        //log.debug( 'is data of String type ? ' + _.isString(data) );
        //log.debug( 'data instanceof Buffer ? ' + (data instanceof Buffer) );
	
        //socket.write('echoing: ' + data); // tested - ok !
		
        /*
        //  TODO:   why ??
        if (data == 'exit\n') {
            log.info('exit command received: ' + socket.remoteAddress + ':' + socket.remotePort + '\n');
            socket.destroy();
        }
        */
        
        //  process data
        var parsedMaps = parser.parse(data); // Buffer of data
  		log.debug( 'tcp parsed data:\n' + parsedMaps);
		
		/*
        if (parsedMaps == null) {
            //socket.write( 0);
            //socket.end();
        }
        */
	   
        if (!parsedMaps) {
			log.error( "Data wasn't parsed." );
			return;
        }
		
        //if ((parsedMaps) && !(parsedMaps instanceof Array)) {
        if (!(parsedMaps instanceof Array)) {
            db.checkIMEI(socket, parsedMaps);
			
			//	TODO:	
			//	
			//	#1	mark socket with IMEI id.
			//	
			//	#2	re-factor:	depending on checkIMEI() result, write to socket here (in callback).
			
			return;
			
            /*
             if (checkIMEI( parsedMaps) == 1) {
             //socket.write( "1");//String.fromCharCode(01));//'\u0001'.charCodeAt(0));
             //socket.write( "1", "utf8");
             socket.sendMessage( '1');
             console.log( 'Ok');
             //socket.end( '1');
             //socket.destroy();
             } else {
             //socket.write( 0);
             //socket.end();
             }
             */
        }
            
		//if (parsedMaps != null && (parsedMaps instanceof Array)) { }
			
		for (var index in parsedMaps) // this approach is safe, in case parsedMaps == null.
		{
			var mapData = parsedMaps[ index ];
			//console.log( mapData, clients[ socket.remoteAddress]);
			var number = mapData['IMEI']; 

			if (number) {
				//  utcDate,utcTime
				//var utcDate = mapData['utcDate'];
				//var utcTime = mapData['utcTime'];
				//var utcDate = new Date(mapData['utcDate']);
				//var utcTime = new Date(mapData['utcTime']);
				//var utcDateTime = new Date(parseInt(mapData['utcDate']) + parseInt(mapData['utcTime']));
				//log.debug('date: ' + utcDate + ' time: ' + utcTime);

				//log.debug('date & time as Date: ' + utcDateTime); // OUTPUT: date & time as Date: 1377818379000
				//log.debug('date&time as String: ' + utcDateTime.toString()); // the same !

				var utcDateTime = mapData['utcDateTime'];
				var lat = mapData['latitude'];
				var lng = mapData['longitude'];

				//  TODO:   verify checksum
				var objUI = {
					type: 'marker', 
					deviceId: number,
					//utcDate: utcDate,
					//utcTime: utcTime,
					utcDateTime: new Date( utcDateTime).toUTCString(),
					altitude: mapData['altitude'], // Unit: meter
					speed: mapData['speedKnots'], // unit: km/hr
					heading: mapData['heading'], // unit: degree
					//reportType: mapData['reportType'], - see: tr-600_development_document_v0_7.pdf -> //4=Motion mode static report //5 = Motion mode moving report //I=SOS alarm report //j= ACC report
					lat: lat, 
					lng: lng
				};            
				io.emit( 'map message', objUI ); // broadcasting using 'emit' to every socket.io client
				log.debug('gps position broadcasted -> map UI');

				var objData = {
					number: number,
					message: data,
					//type: 'marker', 
					//utcDate: utcDate,
					//utcTime: utcTime,
					utcTime: new Date( utcDateTime),
					_timestamp: new Date( utcDateTime),
					altitude: mapData['altitude'], // Unit: meter
					speed: mapData['speed'], // unit: km/hr
					heading: mapData['heading'], // unit: degree
					//reportType: mapData['reportType'], - see: tr-600_development_document_v0_7.pdf -> //4=Motion mode static report //5 = Motion mode moving report //I=SOS alarm report //j= ACC report
					longitude: lng,
					latitude: lat
				};

				try {
					db.save_into_db(objData);   //TODO: return errors and process them
					log.debug('data passed -> DB');
				} catch (e) {
					log.error(e);
				}	
			}
		}

        //socket.write( 1);
        //socket.end();

    });

    socket.on('close', function() {
        //console.log('TCP disconnected ' + client);
        log.info( 'TCP disconnected ' + client );
    });
    
    socket.on('error', function( err ) {
        //console.log('TCP ERROR: ' + err);
        log.error('TCP: ', err);
    });

    //socket.end( "1");
    //socket.end();
	
}).listen( portTcp, function() { 
    //console.log('TCP  listening on *:8888');
    log.info( 'TCP  listening on *:' + portTcp );
});
