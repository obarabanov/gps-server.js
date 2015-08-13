
var net = require('net');
var config = require('../modules/config');

var client = new net.Socket();
client.setEncoding('utf8');

client.on('data', function(data) {
    console.log('server response: ' + data);
});

client.on('close', function() {
    console.log('connection is closed');
});

client.on('error', function (err) {
    console.log('TCP ERROR: ' + err);
});
    
var host = 'localhost';
var portTcp = config.get('tcp:port');

function sendData( strData ) {
    console.log('connecting to: ' + host + ':' + portTcp);
    client.connect( portTcp, host, function() {

        console.log('connected to server');

        var data = '';
        data = strData;
        //data = 'hello 123';
        //data = 'GSr,354660042226111,00,4,c000,c000,3,290813,231939,E03407.9321,N4426.5012,31,0.00,0,6,1.8,12650,12620mV,0,0,0,0,0,21046,0,255,01,5DE0,2BA4*62!';

        client.write( data );
        client.end();
        console.log('data sent.');
    });
}

var arrData = [
        'GSr,354660042226111,00,4,c000,c000,3,290813,231939,E03407.9321,N4426.5012,31,0.00,0,6,1.8,12650,12620mV,0,0,0,0,0,21046,0,255,01,5DE0,2BA4*62!',
        //'GSr,354660042226111,00,5,e080,e080,3,290813,154701,E03407.8904,N4426.4621,35,6.06,34,10,1.0,13990,13970mV,0,0,0,0,0,20946,0,255,01,5DE0,2BA5*61!',
        'GSr,354660042226111,00,5,e080,e080,3,290813,154157,E03408.1013,N4427.1431,92,21.88,120,9,1.2,14090,14090mV,0,0,0,0,0,18913,0,255,01,5DE0,3D2D*5A!',
        'GSr,354660042226111,00,5,e080,e080,3,290813,153957,E03408.0595,N4427.3934,169,28.64,238,9,1.2,14180,14150mV,0,0,0,0,0,17708,0,255,01,5DE0,B3EF*14!',
        'GSr,354660042226111,00,5,e080,e080,3,290813,153525,E03408.1370,N4428.9264,164,0.00,0,9,1.2,14120,14130mV,0,0,0,0,0,14097,0,255,01,5DDE,36ED*2A!',
        'GSr,354660042226111,00,5,e080,e080,3,290813,153154,E03408.4433,N4428.9417,148,6.09,244,9,1.2,14140,14130mV,0,0,0,0,0,12624,0,255,01,5DDE,36EE*23!'
];

for (var index in arrData.reverse()) {
    setTimeout( sendData, 1000 + 2000 * index, arrData[index] )
}
