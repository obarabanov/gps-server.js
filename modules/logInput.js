var dateFormat = require('dateformat');

var winston = require('winston');
//var config = require('winston/lib/winston/config');
//winston.add(require('winston-daily-rotate-file'), options);
//winston.add(require('winston-daily-rotate-file'), {});
//winston.add(require('winston-daily-rotate-file'));
//var winston_drf = require('winston-daily-rotate-file')

function getLogger(module) {
    
    return new winston.Logger({
        transports : [
            /**
             * DailyRotateFile Transport
             * @see: https://github.com/winstonjs/winston-daily-rotate-file
             * @see: https://github.com/winstonjs/winston/blob/master/docs/transports.md
             */
            new winston.transports.DailyRotateFile({
                json:       false,
                //dirname: ,
                filename:   __dirname + '/../logs/input.log', // TODO:  make /logs directory configurable.
                datePattern:'.yyyy-MM',
                level:      'info',
                
                formatter: function (options) {
                    // Return string will be passed to logger.
                    //var now = options.timestamp();
                    var strDateTime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss.l");
                    return strDateTime + ' |"' +
                            (undefined !== options.message ? options.message : '') +
                            '"';
                            //(options.meta && Object.keys(options.meta).length ? '\n\t' + JSON.stringify(options.meta) : '');
                }
            })
        ]
    });
}
module.exports = getLogger;