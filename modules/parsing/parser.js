var _ = require('underscore');
var log = require('../log')(module);
var globalsat = require('./protocols/globalsat');
var teltonika = require('./protocols/teltonika');

var parser = {};
module.exports = parser;


//  TODO:   invent protocol auto-detecting: apply every parser's rules to detect specific format.
//          Because, top 'parser' module should not be aware of external parsers & protocols.
parser.recognizePacketType = function (data)
{
    if (!_.isString(data)) {
        log.error('Data is not of String type.');
        return undefined;
    }

    if (data.length >= 15 && data.length <= 17) {
        //  TODO:   if data == Binary
        return 'init session packet';

    } else if (data.lastIndexOf('!') == data.length - 1) {
        return 'GlobalSat';

    } else if (data.length > 17) {
        return 'Teltonika';
    }

    return undefined;
};

/**
 * Procession of received data packet.
 * It's an entry point of parsing process.
 *
 * @param {Socket} socket - socket connection.
 * @param {Buffer} buffer - raw binary data of Buffer type.
 */
parser.parse = function (socket, buffer)
{
    var strData = buffer.toString('utf8'); // convert binary data to string so it can be processed.
    log.debug('packet.length: ' + strData.length + ' as string: ' + strData);

    var packetType = parser.recognizePacketType(strData);
    log.debug("packet's format: " + packetType);
    if (!packetType) {
        log.error("Unrecognized data packet's format. Procession cancelled.");
        return null;
    }

    switch (packetType)
    {
        case 'GlobalSat':
            return globalsat.parse(strData);

        case 'init session packet':
            //  TODO    error-handling - notify device & deny session, if there is an error.
            socket.IMEI = teltonika.parseIMEI(strData); // keep device's IMEI (ID) in socket connection
            //socket.write(0); // reply '0' to deny session.
            socket.write(String.fromCharCode(0x01)); // reply '1' to device, to keep buffer connection opened and get further data.
            return 'connection initialized';

        case 'Teltonika':
            return teltonika.parse(socket, buffer);

        default:
            log.error("Unsupported data packet's format: "+ packetType +" Procession cancelled.");
            return null;
    }
};
