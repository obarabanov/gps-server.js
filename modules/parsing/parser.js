var _ = require('underscore');
var log = require('../log')(module);
var globalsat = require('./protocols/globalsat');
var teltonika = require('./protocols/teltonika');

var parser = {};
module.exports = parser;

var protocols = [globalsat, teltonika]; //TODO: add more protocol modules here
/*
//  Definition with protocol providers with priorities.
//  Parser can run every provider.canParse() method,
//  if there are multiple providers able to parse the data,
//  then they will be used for real parsing according to their
//  priorities - the highest first, then lower, so on until
//  data successfully parsed.

var protocols = [
    {provider: globalsat, priority: 10},
    {provider: nmea, priority: 0},
    {provider: teltonika, priority: 1}
];
*/

//  TODO:   invent protocol auto-detecting: apply every parser's rules to detect specific format.
//          Because, top 'parser' module should not be aware of external parsers & protocols.

/**
 * Procession of received data packet.
 * It's an entry point of parsing process.
 *
 * @param {Socket} socket - socket connection.
 * @param {Buffer} buffer - raw binary data of Buffer type.
 */
parser.parse = function (socket, buffer)
{
    /*
     TODO implement:
     method in every specific parser.canParse( data ) ?
     return:
     -1 : method not implemented
     0 : can't parse / unrecognized format
     1 : yes, can parse - format supported
     */

    /*
    for (var provider of protocols) { // @see: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...of
        log.debug('var provider = ' + provider);
    }
    */

    var provider;
    for (var i = 0; i < protocols.length; i++)
    {
        provider = protocols[i];

        var supported = -1; // not implemented
        try {
            supported = provider.canParse( buffer );
        } catch(ex) {
            log.error('protocol provider failure: ' + ex);
        }
        if (supported == -1) {
            log.debug('method canParse() not implemented.');
        }
        if (supported == true) {
            break;
        }

        //  TODO:   arrange parsing try if no canParse() methods found - just try using parse() method directly.
    }

    //  using first provider which claims it can parse.
    try {
        return provider.parse(socket, buffer);
    } catch(ex) {
        log.error('parsing failure: ' + ex);
    }

    /*
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
    */

};

/*
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
*/