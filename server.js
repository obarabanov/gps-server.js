/**
 * This is an example of how to use 'gps-server' module from within your app.
 *
 * This file can also be used for running standalone GPS server, especially
 * with help of such packages like 'forever':
 *
 * forever start -a -l logs/forever.log -o logs/out.log -e logs/err.log server.js
 *
 */
var gpsServer = require('./gps-server');

var eventEmitter = gpsServer(); //  start GPS server

//  handle data processed and returned by gps-server
eventEmitter.on('gps_data', function(data) {
    //console.log('this happens synchronously');
    //  preferably, handle data asynchronously, to not affect on gps-server
    setImmediate(function(data) {
        console.log('EVENT async "gps_data" : ');
    }, data);
});

eventEmitter.on('gps_data_tcp', function(data) {
    setImmediate(function(data) {
        console.log('EVENT async "gps_data_tcp" : ');
    }, data);
});

/*
//  TBD
eventEmitter.on('gps_data_http', function(data) {
    console.log('EVENT "gps_data_http" : ' + data);
});
*/