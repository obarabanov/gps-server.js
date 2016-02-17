
var net = require('net');
var config = require('../modules/config');
var log = require('../modules/log')(module);
var fs = require('fs');
var _ = require('underscore');
var parser = require('../modules/parser');

var client = new net.Socket();
client.setEncoding('utf8');

client.on('data', function(data) {
    log.debug('server response: ' + data);
});

client.on('close', function() {
    log.info('connection is closed');
});

client.on('error', function (err) {
    log.error('TCP ERROR: ' + err);
});
    
var host = 'localhost';
var portTcp = config.get('tcp:port');

function sendData( strData ) {
    log.info('connecting to: ' + host + ':' + portTcp);
    client.connect( portTcp, host, function() {
        log.debug('connected to server');
        client.write( strData );
        client.end();
        log.debug('data sent.');
    });
}

/**
	Procession flow:

	open file
	read by line
	detect time of line & delay for the time
	send data line

 */

playtrack( 'demo.log');
/*
playtrack( 'track121006a.txt');
playtrack( 'track121006b.txt');
playtrack( 'track121013a.txt');
playtrack( 'track121013b.txt');
playtrack( 'track121102.txt');
playtrack( 'track131116.txt');
playtrack( 'track140103.txt');
playtrack( 'track140107.txt');
playtrack( 'track150311a.txt');
playtrack( 'track150311b.txt');
*/

function playtrack( filename)
 
{
	try {
		fs.readFile(filename, 'utf8', 
			function(err, data) {
				if (err) throw err;
				
				//	data - entire contents of a file.
				//log.debug( 'is data of String type ? ' + _.isString(data) ); // this is true
				var lines = data.toString().split( '\r\n' );
				log.debug('file "' + filename + '" has ' + lines.length + ' lines');
				
				var previousTime;
				var delaySum = 0;
				//for (var index = 0; index < lines.length; index++) {
				for (var index = 35; index < 50; index++) { // testing
				//for (var index in lines.reverse()) { // lines should be processed in reverse.
					var sending = lines[index];
					//log.debug( 'is line of String type ? ' + _.isString(sending) + '"' + sending + '"' );
					var socket = {};				
					
					var parsedData = parser.parse( socket, sending);
					if (!parsedData) {	//	null || undefined
						log.error( "Data line wasn't parsed. Procession stopped." );
						return;
					}
					var parsedMaps;
					if (_.isArray(parsedData)) {
						parsedMaps = parsedData;
					}
					if (!parsedMaps) {
						log.error('Wrong parsed data format. Procession stopped.');
						return;
					}
					
					var utcDateTime;
					for (var idx in parsedMaps)
					{
						var mapData = parsedMaps[ idx ];
						utcDateTime = new Date(mapData['utcDateTime']);
						//log.debug( 'is utcDateTime of Date type ? ' + _.isDate(utcDateTime) + ' "' + utcDateTime + '"' );
					}
					
					var delay; // in millis
					if (previousTime) {
						//delay = utcDateTime.valueOf() - previousTime.valueOf();
						delay = Math.abs(utcDateTime.getTime() - previousTime.getTime()); // in motion == 30000 millis
						delay = Math.round(delay / 3); // for faster testing
						delaySum += delay;
						log.debug( 'delay: ' + delay + ' millis. Data will be sent after ' + delaySum / 1000 + ' seconds.');
						setTimeout( sendData, Math.round(delaySum), sending );
					} else {
						setTimeout( sendData, 1000, sending );
					}
					//setTimeout( sendData, 1000 + 2000 * index, sending ); // every 2 seconds
					
					previousTime = utcDateTime;
					
				}
			}
		);
	} catch(err) {
		log.error(err);
	}
}