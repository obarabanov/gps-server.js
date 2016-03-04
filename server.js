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

//  start GPS server
gpsServer();
