var _ = require('underscore');
var log = require('../../log')(module);

// --- GlobalSat GPS ------------------------------------------------------------
var parser = {};
module.exports = parser;

labels = {
    NO_VALUE: '<no value>',
    NO_PARAM: 'unknown'
};

/**
 * Are passed data in supported format and can be parsed ?
 *
 * @param data
 * @returns {boolean}   true if data format recognized and can be parsed,
 *                      false otherwise.
 */
parser.canParse = function (data)
{
    log.debug('globalsat.canParse():');
    var strData;
    try {
        //  TODO:   wrap as ensureString() method.
        if (_.isString(data)) {
            strData = data;
        } else {
            //  trying convert data
            if (data instanceof Buffer) {
                strData = data.toString('utf8'); // convert binary data to string so it can be processed.
            } else {
                throw new Exception("can't convert data to String.");
            }
        }

        //  The general format of GlobalSat TR-600 message is:    GSx,IMEI,[T,S,]Field1,Field2,……,FieldN*Checksum!
        //  NOTE:   Checksum - is the hexadecimal value, converted to two ASCII characters (0-9, A-F)
        var pattern = /GS[SsGgCrhe]{1},\d{15},.+\*[0-9A-F]{2}!/; //  use RegExp for data format verification
        var passed = pattern.test(strData);
        log.debug('passed RegExp ? ' + passed);
        return passed;

    } catch(ex) {
        log.error('Data packet analysis failed: ' + ex);
    }
    return false;
}

//parser.parse = function (data)
parser.parse = function (socket, data)
{
    if (!_.isString(data)) {
        var strData;
        //  trying convert data
        if (data instanceof Buffer) {
            strData = data.toString('utf8'); // convert binary data to string so it can be processed.
        }
        data = strData;
    }

    //  for 'GlobalSat' only
    var arrParsedMaps = [];
	log.info( 'Start parsing of GlobalSat data');

    //  slice data string in multiple packets, if any.
    var packets = data.split('!');
    //  always suppress last part as it's just an empty string
    if (packets[packets.length - 1] == '') {
        packets.pop();
    }
    log.info('found ' + packets.length + ' packets in data string.');

    if (packets.length == 0) {
        log.error('Data packets in proper format not found, parsing cancelled.');
        return null;
    }

    //  GlobalSat format:
    //  IMEI играет роль серийного номера аппарата и передаётся в эфир при авторизации в сети. 
    //  IMEI используется только для идентификации устройства и не имеет постоянного отношения к абоненту. Вместо него используется номер IMSI, хранящийся на SIM-карте
    var REPORT_TEMPLATE = "dataType,IMEI,alarmStatus,reportType,xField,jointIOStatus,gpsFix,utcDate,utcTime,longitude,latitude,altitude,speedKnots,heading,satellites,hdop,batteryVoltage,batteryCapacity,analogInput0,counter0,counter1,counter2,counter3,odometer,geofenceDistance";
    var arrParamNames = REPORT_TEMPLATE.split(',');
    //log.debug('number of supported params: ' + arrParamNames.length);

    //  TODO:   verify packet's checksum !!
	
    for (var index in packets) {   //  returns index of array item

        var strDataPacket = packets[ index ];
        var arrParamValues = strDataPacket.split(',');
        //log.debug('number of params in the packet: ' + arrParamValues.length);
        if (arrParamValues[0].trim() != 'GSr') {
            log.error('Wrong packet\'s data type, expected "GSr" but got: "' + arrParamValues[0] + '"');
            continue;
        }

        var count;
        if (arrParamNames.length >= arrParamValues.length) {
            count = arrParamNames.length;
        } else {
            count = arrParamValues.length;
            var exceeds = arrParamNames.length;
        }
        log.info('number of supported params: ' + arrParamNames.length + ', number of actual values in data string: ' + arrParamValues.length);

        var mapParams = [];
        for (var i = 0; i < count; i++) {
            //  keys and values with suppressed spaces
            if (exceeds && i >= exceeds) {
                mapParams[ labels.NO_PARAM + i ] = arrParamValues[i].trim();
            } else {
                //mapParams[ arrParamNames[i].trim() ] = arrParamValues[i].trim();
                mapParams[ arrParamNames[i].trim() ] = (i < arrParamValues.length) ? arrParamValues[i].trim() : labels.NO_VALUE;
            }
        }
		
		var lat = ensureDecimal( mapParams['latitude'] );
		var lng = ensureDecimal( mapParams['longitude'] );
		
		mapParams['latitude'] = lat;
		mapParams['longitude'] = lng;
		
		var utcDateTime = ensureUtc( mapParams['utcDate'], mapParams['utcTime']);
		mapParams['utcDateTime'] = utcDateTime;
		
		var speed = parseFloat(mapParams['speedKnots']) * 1.852;
		mapParams['speed'] = speed;
		
        //log.debug( 'map built: ' + mapParams.toString() );
        arrParsedMaps.push(mapParams);

    }
    log.info( 'Parsing completed: ' + arrParsedMaps.toString() );
    return arrParsedMaps;
};

function ensureDecimal(strValue)
{
    var res = '';
    try {
        res = convert2decimal(strValue);
    } catch (e) {
        log.error(e);
    }
    return res;
};

/**
 * expected format:    E03408.0595,N4427.3934
 * 
 * @param {type} strValue
 * @returns {String}
 */
function convert2decimal(strValue)
{
    if (_.isEmpty(strValue)) {
        throw new Error('Can\'t convert empty string into decimal coords value.');
    }

    //  E и N означают +, +
    //  далее 03407.9321 /100 = 034 градусов + 0.079321 / 60 * 100 минуты и секунды = 0,132201667 далее складываем и получаем 34,132201667
    //    
    //      Java code:
    //    Double f = Double.parseDouble( s.substring( 1));
    //    if (s.indexOf( ".") > 3) {
    //        f = Math.round( f / 100) +((f / 100) -Math.round( f / 100)) / 0.6;
    //    }

    var res;
    res = parseFloat(strValue.substr(1));
    res = Math.round(res / 100) + ((res / 100) - Math.round(res / 100)) / 0.6;

    var leadMark = strValue.substr(0, 1).toUpperCase();
    switch (leadMark) {
        case 'E':
        case 'N':
            //  as is
            break;

        case 'W':
        case 'S':
            res = -res;
            break;

        default:
            throw new Error('String must be starting with either of: "E", "W", "N", "S".');
    }

    return res.toString();
};

function ensureUtc(strDate, strTime)
{
    //  formatter = new SimpleDateFormat("ddMMyy");
    //  DateFormat formatter = new SimpleDateFormat("HHmmss");
    if (_.isEmpty(strDate) || strDate.length != 6) {
        log.error('Date string is empty, or has length != 6');
        return null;
    }
    if (_.isEmpty(strTime) || strTime.length != 6) {
        log.error('Time string is empty, or has length != 6');
        return null;
    }

    try {
        //  new Date(year, month[, day[, hour[, minutes[, seconds[, milliseconds]]]]]);
        var month = parseInt(strDate.substr(2, 2)) - 1;
        //var utcDateTime = new Date( '20'+strDate.substr(4, 2), month, strDate.substr(0, 2), strTime.substr(0, 2), strTime.substr(2, 2), strTime.substr(4, 2) );
        var utcDateTime = Date.UTC('20' + strDate.substr(4, 2), month, strDate.substr(0, 2), strTime.substr(0, 2), strTime.substr(2, 2), strTime.substr(4, 2));
    } catch (e) {
        log.error(e);
        return null;
    }
    //return utcDateTime.toUTCString(); // no such method
    return utcDateTime;
};
