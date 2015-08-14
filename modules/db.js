var mysql = require('mysql');
var log = require('../modules/log')(module);
var config = require('../modules/config');

var db = {};
module.exports = db;

//  =========   DB
var dbconf;
if ((config.get('environment') == 'dev') || (config.get('env') == 'dev')) {
	dbconf = config.get('db_dev');
} else {
	dbconf = config.get('db');
}

//	using connection pool for better DB performance
//	@see https://github.com/felixge/node-mysql#pooling-connections
var pool  = mysql.createPool( dbconf );

/**
 * It's just for testing DB connection.
 * @returns {String}
 */
db.ping_db = function ()
{
	var status = 'unclear';
	
	/*
	//	straight connections-based approach
	
	var connection = mysql.createConnection(dbconf);
	//	in case there are no per-query callbacks
	connection.on('error', function (err) {
		log.error(err.code);
	});
	connection.connect(function (err) {
		if (err) {
			log.error('error connecting: ' + err.stack);
			status = 'connection error';
			return;
		}
		log.debug('connected as id: ' + connection.threadId);
		status = 'connected';
	});
	//connection.end();
	connection.end(function (err) {
		// The connection is terminated now
		if (err) {
			log.error('error on connection.end(): ' + err.stack);
		}
		log.debug('connection: ' + connection.threadId + ' ended.');
	});
	*/

	//	pooled connections approach
	pool.getConnection(function(err, connection) {
		
		if (err) {
			log.error('error getting connection from pool: ' + err.stack);
			status = 'connection error';
			return;
		}
		
		log.debug('connected as id: ' + connection.threadId);
		
		status = 'connected';
		//log.debug('status: ' + status);
		//  TODO:   announce status asynchronously
		
		// And done with the connection.
		connection.release();
		// Don't use the connection here, it has been returned to the pool.
		
	});
	return status;
};

db.save_into_db = function (data)
{
	var status = '';

	/*
	var connection = mysql.createConnection(dbconf);
	connection.connect(function (err) {
		if (err) {
			log.error('error connecting: ' + err.stack);
			status = 'connection error';
			return;
		}
		log.debug('connected as id: ' + connection.threadId);
		status = 'connected';
	});
	*/
   
	pool.getConnection(function(err, connection) {
		if (err) {
			log.error('error getting connection from pool: ' + err.stack);
			status = 'connection error';
			return;
		}
		log.debug('connection id: ' + connection.threadId);
		status = 'connected';
		
		connection.query('SELECT * FROM gps Where number = ?', 
			[data.number], 
			function (err, rows, fields) {
				//if (err) throw err;
				if (err) {
					log.error('DB error: ' + err);
					return;
				}

				status += ', Rows found: ' + rows.length;
				//log.debug(status + '\n', rows);
				//log.debug('\nFields: \n', fields);

				if (rows.length > 0)
				{
					data[ 'gps_id'] = rows[0].id;
					log.debug('GPS ID: ', rows[0].id);

					connection.query('INSERT INTO geometries (_TIMESTAMP, type, geometry, creator_id, created, deleted, propertyA, propertyB, propertyC) VALUES (now(), "Point", GeomFromText( \'POINT(? ?)\'), 2, now(), 0, 0, 0, 0)', 
						[parseFloat(data.longitude), parseFloat(data.latitude)], 
						function (err, res) {
							//if (err) throw err;
							if (err) {
								//	this is the only way to prevent app crash & handle errors like:
								//2015-08-14 17:23:03.207 ERROR [db.js] DB error: Error: ER_NO_SUCH_TABLE: Table 'gis_tracking.geometries' doesn't exist
								log.error('DB error: ' + err);
								return;
							}
							
							data[ 'geometry_id'] = res.insertId;
							data[ 'creator_id'] = 2;
							data[ 'created'] = new Date();
							data[ 'deleted'] = 0;
							log.debug('Geometry ID: ', res.insertId);

							connection.query('INSERT INTO gps_data SET ?', 
								data, 
								function (err, res) {
									//if (err) throw err;
									if (err) {
										log.error('DB error: ' + err);
										return;
									}
									log.debug('GPS Data ID: ', res.insertId);
								}
							);
						}
					);
				}
			}
		);

		log.debug('status: ' + status);
			
		// And done with the connection.
		connection.release();
		// Don't use the connection here, it has been returned to the pool.
	});

	/*
	//connection.end();
	connection.end(function (err) {
		if (err) {
			log.error('error on connection.end(): ' + err.stack);
		}
		log.debug('connection: ' + connection.threadId + ' ended.');
	});
	*/
};

db.checkIMEI = function (socket, number)
{
	var status = 0;
	/*
	var connection = mysql.createConnection(dbconf);
	connection.connect(function (err) {
		if (err) {
			log.error('error connecting: ' + err.stack);
			return status;
		}
		log.debug('connected as id: ' + connection.threadId);
	});
	*/

	pool.getConnection(function(err, connection) {
		if (err) {
			log.error('error getting connection from pool: ' + err.stack);
			return status;	//	FIXME:	is will return from: function(err, connection) - anonymous callback function. Not from checkIMEI() method.
			//	TODO:	maybe close socket here ?
		}
		log.debug('connection id: ' + connection.threadId);

		connection.query('SELECT * FROM gps Where number = ?', 
			[number], 
			function (err, rows, fields) {
				if (err) {
					//throw err;
					
					//	TODO:	maybe close socket here ?
					log.error('DB error: ' + err);
					return;
				}

				if (rows.length > 0) {
					status = 1;
					socket.imei = number; // keep it in socket connection
					socket.write(String.fromCharCode(0x01));
					//socket.write('Welcome to the Telnet server!\n');
					//socket.end();
					log.info('GPS ID: ', rows[0].id, String.fromCharCode(0x01));
				} else {
					//	TODO:	close socket here, to infor device it's not registered and release socket resources.
					log.info('GPS IMEI: ', number, ' not found');
				}
			}
		);
		log.debug('checkIMEI() status: ' + status);
		
		// And done with the connection.
		connection.release();
		// Don't use the connection here, it has been returned to the pool.
	});
	
	/*
	connection.end(function (err) {
		// The connection is terminated now
		if (err) {
			log.error('error on connection.end(): ' + err.stack);
		}
		log.debug('connection: ' + connection.threadId + ' ended.');
	});
	*/
};
