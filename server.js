
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var net = require('net');
var mysql = require('mysql');
var _ = require('underscore');

//var logger = require('morgan');
var log = require('./modules/log')(module);
var config = require('./modules/config');
var parser = require('./modules/parser');

var clients = [];

//  =========   Express endpoints
//app.use(logger('dev')); // выводим все запросы со статусами в консоль
app.use(express.static('public'));

app.get('/', function(req, res){
  //res.send('<h1>Hello world</h1>');
  //res.sendFile(__dirname + '/public1/chat.html'); // works ok ! // NOTE: but index.html always has priority, and rendered instead..
  res.sendFile(__dirname + '/public/map.html'); 
});

app.get('/db', function(req, res) {
    
    var status = ping_db(); //  TODO: status is blank, wait for asynch queries procession
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
  //console.log('HTTP listening on *:3000');
  log.info('HTTP listening on *:' + portHttp);
});

//  =========   TCP - tested OK !
var portTcp = config.get('tcp:port'); // 8888
var tcp = net.createServer( function(socket) {
    
    var client = 'host ' + socket.remoteAddress + ':' + socket.remotePort;
    //console.log('\nTCP  socketected ' + client);
    log.info('TCP  socketected ' + client);
    
    //socket.setEncoding('utf8'); // to convert Buffer -> String
    
    tcp.getConnections(function(err, count) {
        if (err) {
            //console.log('ERROR of counting active TCP socketections');
            //log.error('Internal error(%d): %s',res.statusCode,err.message);
            log.error('ERROR of counting active TCP socketections');
            return;
        }
        //server.maxsocketections # Set this property to reject socketections when the server's socketection count gets high. 
        //console.log('TCP active socketections: ' + count );// + ' of max: ' + tcp.maxsocketections); // undefined
        log.info( 'TCP active socketections: ' + count );
    });
	/*
	setTimeout(function () {
      socket.destroy();
    }, 20000);	
	*/
	//socket.write('Welcome to the Telnet server!\n');
	
	socket.on('connect', function() {
		var hex = 0x01;
		var buff = new Buffer( 1);
		buff.writeUInt8(hex, 0);
		
		socket.write( buff, function() {
			console.log( buff, 'flushed');
		});		
	});
    
	//var buffer = new Buffer(0, 'binary');
	
    socket.on('data', function(data) 
	{
		//buffer = Buffer.concat([buffer, new Buffer(data,'binary')]);        
        //console.log('tcp ' + client + '  passed data:\n' + new Buffer(data,'binary'));
        log.info( 'tcp ' + client + '  passed data:\n' + data );
        //socket.write('echoing: ' + data); // tested - ok !
        
        //log.debug( 'is data of String type ? ' + _.isString(data) );
        //log.debug( 'data instanceof Buffer ? ' + (data instanceof Buffer) );
		
		if (data == 'exit\n') {	
			log.info('exit command received: ' + socket.remoteAddress + ':' + socket.remotePort + '\n');		
			socket.destroy();
		}
        
        //  process data
        var parsedMaps = parser.parse( data.toString('utf8'), data); // array of Maps
  		log.info( 'tcp parsed data:\n' + parsedMaps);
		
		if (parsedMaps != null) 
		{
			if (parsedMaps instanceof Array) 
			{
				for (var index in parsedMaps) // this approach is safe, in case parsedMaps == null.
				{
					var mapData = parsedMaps[ index ];
					console.log( mapData, clients[ socket.remoteAddress]);
					var number = mapData['IMEI']; 
					
					if (number) 
					{
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
						
						//  TODO: verify checksum
						
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
							//lat: lat, 
							//lng: lng
							longitude: lng,
							latitude: lat
						};
						
						var htmData = {
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
						
						ping_db( objData);
						io.emit( 'map message', htmData ); // broadcasting using 'emit' to every socket.io client
						log.debug('gps position broadcasted -> map UI');
					}
				}
				
				//socket.write( 1);
				//socket.end();
			} else {
				checkIMEI( socket, parsedMaps);
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

		} else {
			//socket.write( 0);
    		//socket.end();
		}
    });

    socket.on('close', function() {
        //console.log('TCP dissocketected ' + client);
        log.info( 'TCP dissocketected ' + client );
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


//  =========   DB
var dbcon = config.get('db');
function ping_db( data) {
	console.log( data);
    var connection = mysql.createConnection( dbcon);
    var status = '';

    connection.connect(function(err) {
      if (err) {
        console.error('error connecting: ' + err.stack);
        status = 'connection error';
        return;
      }

      console.log('connected as id: ' + connection.threadId);
      status = 'connected';
    });

    connection.query('SELECT * FROM gps Where number = ?', [data.number], function(err, rows, fields) {
      if (err) throw err;
      status += ', Rows found: '+rows.length;
      //console.log(status + '\n', rows);
      //console.log('\nFields: \n', fields);
	  
	  if (rows.length > 0) 
	  {
	    data[ 'gps_id'] = rows[0].id;
		console.log('GPS ID:', rows[0].id);
		
		connection.query( 'INSERT INTO geometries (_TIMESTAMP, type, geometry, creator_id, created, deleted, propertyA, propertyB, propertyC) VALUES (now(), "Point", GeomFromText( \'POINT(? ?)\'), 2, now(), 0, 0, 0, 0)', [ parseFloat( data.longitude), parseFloat( data.latitude)], function(err,res) {
			if(err) throw err;
			data[ 'geometry_id'] = res.insertId;
			data[ 'creator_id'] = 2;
			data[ 'created'] = new Date();
			data[ 'deleted'] = 0;
			console.log('Geometry ID:', res.insertId);
		
			connection.query( 'INSERT INTO gps_data SET ?', data, function(err,res) {
				if(err) throw err;
				console.log('GPS Data ID:', res.insertId);
			});
		});
	  }
    });
	
	//connection.end();
    
    //  TODO:   wait for asynch queries procession
    console.log('status: ' + status);
    return status;
}

function checkIMEI( socket, number) 
{
	//console.log( number);
    var connection = mysql.createConnection( dbcon);
    var status = 0;

    connection.connect(function(err) {
		if (err) {
			console.error('error connecting: ' + err.stack);
			return status;
		}

		console.log('connected as id: ' + connection.threadId);
    });

    connection.query('SELECT * FROM gps Where number = ?', [number], function(err, rows, fields) {
		if (err) throw err;
		
		if (rows.length > 0) {
			status = 1;
			socket.write( String.fromCharCode( 0x01));
			//socket.write('Welcome to the Telnet server!\n');
			//socket.end();
			clients[ socket.remoteAddress] = number;
			console.log('GPS ID:', rows[0].id, String.fromCharCode( 0x01));
		} else {
			console.log('GPS IMEI:', number, 'is not found');
		}
    });

    //return status;
}