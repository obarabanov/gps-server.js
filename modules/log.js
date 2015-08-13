var winston = require('winston');
var config = require('winston/lib/winston/config');
var dateFormat = require('dateformat');

function getLogger(module) {
    
    var path;
    path = module.filename.split('\\').slice(-1).join('/'); // slice(-2) //отобразим метку с именем файла, который выводит сообщение
    
        /*
    var upperCaseLevels = {
        levels: {
          INFO: 0,
          bar: 1,
          baz: 2,
          foobar: 3
        },
        colors: {
          INFO: 'green',
          DEBUG: 'yellow',
          ERROR: 'red'
        }
    };    
    winston.addColors(upperCaseLevels.colors);
        */

    var colors = {
        INFO: 'green',
        DEBUG: 'yellow',
        ERROR: 'red'
    };
    winston.addColors(colors);

    return new winston.Logger({
        transports : [
            
            //  TODO:
            //new (winston.transports.File)({ filename: 'server.log' }),            
            
            //  DailyRotateFile Transport - see: https://github.com/winstonjs/winston/blob/master/docs/transports.md
            
            new winston.transports.Console({
                
                colorize:   true,//'all',
                level:      'debug',
                showLevel:  true,
                label:      path,
                
                //timestamp: Date.now().toLocaleString()
                //timestamp: Date.now().toLocaleDateString()
                //timestamp: Date.now().toDateString()
                
                /*
                colors: {
                    info: 'green',
                    debug: 'yellow',
                    error: 'red'
                },
                */
    
                /*
                timestamp: function() {
                  //return Date.now();
                  return new Date();
                },
                */
                
                formatter: function (options) {
                    // Return string will be passed to logger.
                    
                    //var now = options.timestamp();
                    //var strDateTime = now.toDateString() + ' ' + now.toLocaleTimeString() + '.' + now.getMilliseconds();
                    var strDateTime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss.l");
                    
                    //return options.timestamp().toDateString() + ' ' + options.timestamp().toLocaleTimeString() + '.' + 
                    return strDateTime + ' ' +
                            config.colorize(options.level.toUpperCase()) + ' ' + 
                            //config.colorize(options.level) + ' ' + 
                            '[' + path + '] ' + 
                            (undefined !== options.message ? options.message : '') +
                            (options.meta && Object.keys(options.meta).length ? '\n\t' + JSON.stringify(options.meta) : '');
                }
                
            })
            
        ]
    });
}

module.exports = getLogger;