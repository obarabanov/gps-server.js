var winston = require('winston');
//var config = require('winston/lib/winston/config');
var dateFormat = require('dateformat');

function getLogger(module) {
    
    return new winston.Logger({
        transports : [
            
            //  DailyRotateFile Transport - see: https://github.com/winstonjs/winston/blob/master/docs/transports.md
            
            new winston.transports.DailyRotateFile({
                
                json:       false,
                filename:   'logs/input.log',
                datePattern:'.yyyy-MM',
                level:      'info',
                
                formatter: function (options) {
                    // Return string will be passed to logger.
                    
                    //var now = options.timestamp();
                    //var strDateTime = now.toDateString() + ' ' + now.toLocaleTimeString() + '.' + now.getMilliseconds();
                    var strDateTime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss.l");
                    
                    return strDateTime + ' : ' +
                            (undefined !== options.message ? options.message : '');// +
                            //(options.meta && Object.keys(options.meta).length ? '\n\t' + JSON.stringify(options.meta) : '');
                }
                
            })
            
        ]
    });
}

module.exports = getLogger;