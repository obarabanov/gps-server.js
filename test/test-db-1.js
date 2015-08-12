
var db = require('node-mysql'); // @see https://github.com/redblaze/node-mysql
//var cps = require('cps');

var DB = db.DB;
//var BaseRow = db.Row;
//var BaseTable = db.Table;

var box = new DB({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'test_db', //  tested OK - connected !

    connectionLimit: 5, //50// The normal connection pool's configuration 
    useTransaction: {// Only if "useTransaction" is provided can "db.transaction" API be called.
        connectionLimit: 1 // the transactional connection pool's configuration
    }
});

var basicTest = function (cb) {
    box.connect(function (conn, cb) {

        console.log('DB connected !');

        cps.seq([
            function (_, cb) {
                conn.query('select * from comment limit 1', cb);
            },
            function (res, cb) {
                console.log(res);
                cb();
            }
        ], cb);
    }, cb);
};

function callback() {
    console.log('callback called');
}

var cb = function() {
    var handleError = function(e) {
        if (e.stack) {
            console.log(e.stack);
        } else {
            console.log(e);
        }
    };

    var start = new Date();
    return function(err, res) {
        try {
            var end = new Date();
            console.log('time spent: ', end-start);
            if (err) {
                handleError(err);
            } else {
                console.log(res);
            }
            box.end();
        } catch(e) {
            handleError(e);
            box.end();
        }
    };
//}();
};



//basicTest();    //  ERROR   
//basicTest( callback ); // OUT:  callback called
basicTest( cb );