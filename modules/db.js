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

//	TODO:	use connection pool instead..

/**
 * It's just for testing DB connection.
 * @returns {String}
 */
db.ping_db = function ()
{
	var status = 'unclear';

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
	//connection.end();
	connection.end(function (err) {
		// The connection is terminated now
		if (err) {
			log.error('error on connection.end(): ' + err.stack);
		}
		log.debug('connection: ' + connection.threadId + ' ended.');
	});


	//  TODO:   wait for asynch queries procession
	log.debug('status: ' + status);
	return status;
};

db.save_into_db = function (data)
{
	var status = '';

	var connection = mysql.createConnection(dbconf);

	//	in case there are no per-operation callbacks
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

	connection.query('SELECT * FROM gps Where number = ?', [data.number], function (err, rows, fields) {
		if (err) throw err;

		status += ', Rows found: ' + rows.length;
		//log.debug(status + '\n', rows);
		//log.debug('\nFields: \n', fields);

		if (rows.length > 0)
		{
			data[ 'gps_id'] = rows[0].id;
			log.info('GPS ID: ', rows[0].id);

			connection.query('INSERT INTO geometries (_TIMESTAMP, type, geometry, creator_id, created, deleted, propertyA, propertyB, propertyC) VALUES (now(), "Point", GeomFromText( \'POINT(? ?)\'), 2, now(), 0, 0, 0, 0)', [parseFloat(data.longitude), parseFloat(data.latitude)], function (err, res) {
				if (err)
					throw err;
				data[ 'geometry_id'] = res.insertId;
				data[ 'creator_id'] = 2;
				data[ 'created'] = new Date();
				data[ 'deleted'] = 0;
				log.info('Geometry ID: ', res.insertId);

				connection.query('INSERT INTO gps_data SET ?', data, function (err, res) {
					if (err)
						throw err;
					log.info('GPS Data ID: ', res.insertId);
				});
			});
		}
	});

	//connection.end();
	connection.end(function (err) {
		if (err) {
			log.error('error on connection.end(): ' + err.stack);
		}
		log.debug('connection: ' + connection.threadId + ' ended.');
	});

	log.info('status: ' + status);
	return status;
};

db.checkIMEI = function (socket, number)
{
	var status = 0;

	var connection = mysql.createConnection(dbconf);
	connection.connect(function (err) {
		if (err) {
			log.error('error connecting: ' + err.stack);
			return status;
		}
		log.debug('connected as id: ' + connection.threadId);
	});

	connection.query('SELECT * FROM gps Where number = ?', [number], function (err, rows, fields) {
		if (err)
			throw err;

		if (rows.length > 0) {
			status = 1;
			socket.imei = number; // keep it in socket connection
			socket.write(String.fromCharCode(0x01));
			//socket.write('Welcome to the Telnet server!\n');
			//socket.end();
			log.info('GPS ID: ', rows[0].id, String.fromCharCode(0x01));
		} else {
			log.info('GPS IMEI: ', number, ' not found');
		}
	});

	connection.end(function (err) {
		// The connection is terminated now
		if (err) {
			log.error('error on connection.end(): ' + err.stack);
		}
		log.debug('connection: ' + connection.threadId + ' ended.');
	});

};
