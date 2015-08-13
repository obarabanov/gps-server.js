var mysql = require('mysql');
var log = require('../modules/log')(module);
var config = require('../modules/config');

var db = {};

//  =========   DB
var dbcon;
//if (config.get('ENV') == 'dev') {
if ((config.get('environment') == 'dev') || (config.get('env') == 'dev')) {
    dbcon = config.get('db_dev');
} else {
    dbcon = config.get('db');
}

/**
 * It's just for testing DB connection.
 * @returns {String}
 */
db.ping_db = function () {
    var connection = mysql.createConnection( dbcon);
    var status = '';

    connection.connect(function(err) {
      if (err) {
        log.error('error connecting: ' + err.stack);
        status = 'connection error';
        return;
      }
      log.debug('connected as id: ' + connection.threadId);
      status = 'connected';
    });
    //  TODO:   wait for asynch queries procession
    log.debug('status: ' + status);
    return status;
};

//TODO:  return errors
db.save_into_db = function (data) {
    var connection = mysql.createConnection( dbcon);
    var status = '';

    connection.connect(function(err) {
      if (err) {
        log.error('error connecting: ' + err.stack);
        status = 'connection error';
        return;
      }

      log.debug('connected as id: ' + connection.threadId);
      status = 'connected';
    });

    connection.query('SELECT * FROM gps Where number = ?', [data.number], function(err, rows, fields) {
      if (err) throw err;
      status += ', Rows found: '+rows.length;
      //log.debug(status + '\n', rows);
      //log.debug('\nFields: \n', fields);
	  
	  if (rows.length > 0) 
	  {
	    data[ 'gps_id'] = rows[0].id;
		log.info('GPS ID: ', rows[0].id);
		
		connection.query( 'INSERT INTO geometries (_TIMESTAMP, type, geometry, creator_id, created, deleted, propertyA, propertyB, propertyC) VALUES (now(), "Point", GeomFromText( \'POINT(? ?)\'), 2, now(), 0, 0, 0, 0)', [ parseFloat( data.longitude), parseFloat( data.latitude)], function(err,res) {
			if(err) throw err;
			data[ 'geometry_id'] = res.insertId;
			data[ 'creator_id'] = 2;
			data[ 'created'] = new Date();
			data[ 'deleted'] = 0;
			log.info('Geometry ID: ', res.insertId);
		
			connection.query( 'INSERT INTO gps_data SET ?', data, function(err,res) {
				if(err) throw err;
				log.info('GPS Data ID: ', res.insertId);
			});
		});
	  }
    });
	
	//connection.end();
    
    log.info('status: ' + status);
    return status;
};

db.checkIMEI = function (socket, number) 
{
    var connection = mysql.createConnection( dbcon);
    var status = 0;

    connection.connect(function(err) {
		if (err) {
			log.error('error connecting: ' + err.stack);
			return status;
		}

		log.debug('connected as id: ' + connection.threadId);
    });

    connection.query('SELECT * FROM gps Where number = ?', [number], function(err, rows, fields) {
		if (err) throw err;
		
		if (rows.length > 0) {
			status = 1;
			socket.write( String.fromCharCode( 0x01));
			//socket.write('Welcome to the Telnet server!\n');
			//socket.end();
			//clients[ socket.remoteAddress] = number;
			log.info('GPS ID: ', rows[0].id, String.fromCharCode( 0x01));
		} else {
			log.info('GPS IMEI: ', number, 'is not found');
		}
    });

    //return status;
};

module.exports = db;
