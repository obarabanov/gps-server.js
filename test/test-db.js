
var mysql      = require('mysql');

var connection = mysql.createConnection({
  host     : 'localhost',
  //port     : 33333,
  database : 'test_db',
  user     : 'root',
  password : ''
});

connection.connect(function(err) {
  if (err) {
    console.error('error connecting: ' + err.stack);
    return;
  }

  console.log('connected as id: ' + connection.threadId);
});

connection.query('SELECT 1 + 1 AS solution', function(err, rows, fields) {
  if (err) throw err;

  console.log('The solution is: ', rows[0].solution);
});

connection.query('SELECT * FROM comment', function(err, rows, fields) {
  if (err) throw err;

  console.log('Rows: \n', rows);
  console.log('Fields: \n', fields);
});

connection.end();