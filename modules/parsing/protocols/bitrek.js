var log = require('../../log')(module);


// --- BiTrek GPS ------------------------------------------------------------
var parser = {};
module.exports = parser;

/**
 * Are passed data in supported format and can be parsed ?
 *
 * @param data
 * @returns {boolean}   true if data format recognized and can be parsed,
 *                      false otherwise.
 */
parser.canParse = function(buffer)
{
    log.debug('teltonika.canParse():');

    if (!Buffer.isBuffer(buffer)) {
        log.error("Data packet is not of Buffer type.");
        return false;
    }
    log.debug("Data packet has length: " + buffer.length);

    //  #1 packet type:
    //  init session packet - 17 bytes [0,15,15 bytes]
    if (buffer.length == 17)
    {
        if (buffer[0] == 0 && buffer[1] == 15) {
            //  for BITREK, first 2 bytes are always 0 and 15 (IMEI length).
            log.debug("Recognized Bitrek 'init session' packet.");
            return true;
        } else {
            log.debug("It's not a Bitrek's 'init session' packet.");
            return false;
        }
    }

    //  #2 Data packet type:
    //  Структура пакета данных:
    //      Преамбула – 4 нуля
    //      Длина данных AVL – 4 байта, от старшего к младшему
    //      AVL – доступные данные
    //      контрольной суммы CRC16 – 4 байта, от старшего к младшему

    if (buffer.length <= 12) {
        log.debug("Data packet is too short. Giving up.");
        return false;
    }

    if (buffer[0] == 0 && buffer[1] == 0 && buffer[2] == 0 && buffer[3] == 0) {
        log.debug("Found leading 4 zeros. Going on.");
    } else {
        log.debug("Not found leading 4 zeros. Giving up.");
        return false;
    }

    //  trying to verify AVL data length
    var lengthAVL = buffer.readUInt32BE(4);
    log.debug("AVL data length: " + lengthAVL);
    if ( (4 + 4 + lengthAVL + 4) === buffer.length ) {
        log.debug("Ok - data packet structure is supported.");
        return true;
    }
    log.debug("No - data packet structure is not supported.");
    return false;
}

parser.parse = function(socket, buffer)
{
    //  #1 packet type:
    //  init session packet - 17 bytes [0,15,15 bytes]
    if (buffer.length == 17)
    {
        if (buffer[0] == 0 && buffer[1] == 15) {
            //  for BITREK, first 2 bytes are always 0 and 15 (IMEI length).
            return parseInitPacket(socket, buffer);
        } else {
            log.debug("It's not a Bitrek's 'init session' packet.");
            return null;
        }
    }

    //  type #2 - Data packet:
    if (buffer.length > 12) {
        return parseDataPacket(socket, buffer)
    }

    log.info("It's not a Bitrek / Teltonika data packet.");
    return null;
}

function parseInitPacket(socket, buffer)
{
    var imei = buffer.toString('ascii').substr(2);
    socket.device_imei = imei; // keep device's IMEI (ID) in socket connection
    socket.write(String.fromCharCode(0x01)); // reply '1' to device, to indicate connection has been initialized.
    log.debug("Session initialized with device_imei: " + socket.device_imei);
    return []; // return value must be Array, otherwise server will close socket connection, and session data will be lost.
};

/**
 * @see BITREK protocol description:
 *
 * TODO: Сервер принимает пакет, проверяет его целостность и отправляет подтверждение:
 *  0 – если пакет имеет неверную контрольную сумму или не разобран,
 *  Число больше 0 соответствующее кол-ву извлечённых записей из принятого пакета.
 *
 * @param socket
 * @param data
 * @returns {*}
 *
 * @author Sergey Shelkovnikov
 */
function parseDataPacket(socket, data)
{
    var propName = 'device_imei';
    if (!socket.hasOwnProperty(propName)) {
        log.error( "Socket's property '"+propName+"' undefined. Procession stopped." );
        socket.write(0); // reply '0' to deny session.
        // here, socket is still open.
        return;
    }

	log.info('Start parsing data in Teltonika format, for IMEI: ' + socket.device_imei);

    var buf;
	if (data instanceof Buffer) {
        buf = data;
    } else {
        buf = stringToBytes(data);
    }

    var gps = [];

    var sizeAVL = bytesToInt(buf, 4, 4);
    var rCRC = bytesToInt(buf, buf.length - 4, 4);
    var cCRC = crc16_teltonika(buf, 8, sizeAVL);

	console.log( buf, buf[ buf.length -4], buf[ buf.length -3], buf[ buf.length -2], buf[ buf.length -1]);
	console.log( sizeAVL, buf.length -4*3);
	console.log( rCRC, cCRC);
    var i = 8;

    if (sizeAVL == buf.length - 4 * 3 && rCRC == cCRC)
    {
        var codec = bytesToInt(buf, i, 1);
        i++;
        var recs = bytesToInt(buf, i, 1);
        i++;
        console.log( codec, recs);

        if (codec == 0x08)
        {
            for (var n = 0; n < recs; n++)
            {
                var position = {};

                position.timestamp = bytesToInt(buf, i, 8);
                i += 8;

                position.preority = bytesToInt(buf, i, 1);
                i++;

                position.lng = bytesToInt(buf, i, 4) / 10000000.0;
                i += 4;

                position.lat = bytesToInt(buf, i, 4) / 10000000.0;
                i += 4;

                position.alt = bytesToInt(buf, i, 2);
                i += 2;

                position.dir = bytesToInt(buf, i, 2);
                position.direction = 0;
                i += 2;

                if (position.dir < 90)
                    position.direction = 1;
                else if (position.dir == 90)
                    position.direction = 2;
                else if (position.dir < 180)
                    position.direction = 3;
                else if (position.dir == 180)
                    position.direction = 4;
                else if (position.dir < 270)
                    position.direction = 5;
                else if (position.dir == 270)
                    position.direction = 6;
                else if (position.dir > 270)
                    position.direction = 7;

                position.satellite = bytesToInt(buf, i, 1);
                i++;

                position.status = "";
                position.alarm = "";

                if (position.satellite >= 3)
                    position.status = "A";
                else
                    position.status = "L";

                position.speed = bytesToInt(buf, i, 2);
                i += 2;

                position.ioEvent = bytesToInt(buf, i, 1);
                i++;

                position.ioCount = bytesToInt(buf, i, 1);
                i++;

                //read 1 byte
                {
                    var cnt = bytesToInt(buf, i, 1);
                    i++;
                    for (var j = 0; j < cnt; j++)
                    {
                        var id = bytesToInt(buf, i, 1);
                        i++;
                        //Add output status
                        switch (id)
                        {
                            case ACC:
                            {
                                var value = bytesToInt(buf, i, 1);
                                position.status += value == 1 ? ",ACC off" : ",ACC on";
                                i++;
                                break;
                            }
                            case DOOR:
                            {
                                var value = bytesToInt(buf, i, 1);
                                position.status += value == 1 ? ",door close" : ",door open";
                                i++;
                                break;
                            }
                            case GSM:
                            {
                                var value = bytesToInt(buf, i, 1);
                                position.status += string.Format(",GSM {0}", value);
                                i++;
                                break;
                            }
                            case STOP:
                            {
                                var value = bytesToInt(buf, i, 1);
                                position.stopFlag = value == 1;
                                position.isStop = value == 1;
                                i++;
                                break;
                            }
                            case IMMOBILIZER:
                            {
                                var value = bytesToInt(buf, i, 1);
                                position.alarm = value == 0 ? "Activate Anti-carjacking success" : "Emergency release success";
                                i++;
                                break;
                            }
                            case GREEDRIVING:
                            {
                                var value = bytesToInt(buf, i, 1);
                                switch (value)
                                {
                                    case 1:
                                    {
                                        position.alarm = "Acceleration intense !!";
                                        break;
                                    }
                                    case 2:
                                    {
                                        position.alarm = "Freinage brusque !!";
                                        break;
                                    }
                                    case 3:
                                    {
                                        position.alarm = "Virage serre !!";
                                        break;
                                    }
                                    default:
                                        break;
                                }
                                i++;
                                break;
                            }
                            default:
                            {
                                i++;
                                break;
                            }
                        }

                    }
                }

                //read 2 byte
                {
                    var cnt = bytesToInt(buf, i, 1);
                    i++;
                    for (var j = 0; j < cnt; j++)
                    {
                        var id = bytesToInt(buf, i, 1);
                        i++;

                        switch (id)
                        {
                            case Analog:
                            {
                                var value = bytesToInt(buf, i, 2);
                                if (value < 12)
                                    position.alarm += string.Format("Low voltage", value);
                                i += 2;
                                break;
                            }
                            case SPEED:
                            {
                                var value = bytesToInt(buf, i, 2);
                                position.alarm += string.Format("Speed", value);
                                i += 2;
                                break;
                            }
                            default:
                            {
                                i += 2;
                                break;
                            }

                        }
                    }
                }

                //read 4 byte
                {
                    var cnt = bytesToInt(buf, i, 1);
                    i++;
                    for (var j = 0; j < cnt; j++)
                    {
                        var id = bytesToInt(buf, i, 1);
                        i++;

                        switch (id)
                        {
                            case TEMPERATURE:
                            {
                                var value = bytesToInt(buf, i, 4);
                                position.alarm += string.Format("Temperature {0}", value);
                                i += 4;
                                break;
                            }
                            case ODOMETER:
                            {
                                var value = bytesToInt(buf, i, 4);
                                position.mileage = value;
                                i += 4;
                                break;
                            }
                            default:
                            {
                                i += 4;
                                break;
                            }
                        }
                    }
                }

                //read 8 byte
                {
                    var cnt = bytesToInt(buf, i, 1);
                    i++;
                    for (var j = 0; j < cnt; j++)
                    {
                        var id = bytesToInt(buf, i, 1);
                        i++;

                        var io = bytesToInt(buf, i, 8);
                        position.status += string.Format(",{0} {1}", id, io);
                        i += 8;
                    }
                }

                //console.log(socket.device_imei);
                //  by now, must be guaranteed: socket.hasOwnProperty('device_imei') == true
                var imei = socket.device_imei;

				if (position.lng != 0 || position.lat != 0) {
					var resData = {IMEI: imei, utcDateTime: position.timestamp, latitude: position.lat, longitude: position.lng, altitude: position.alt, heading: 0, speed: position.speed};
					//console.log( resData, position);
					gps.push( resData);
				}
            }
        }

        console.log( gps);
        return gps;
    }

    return null;
};

function crc16_teltonika(data, p, size)
{
    var crc16_result = 0x0000;
    for (var i = p; i < p + size; i++)
    {
        var val = 1 * (data[ i]); // +i);
        crc16_result ^= val;
        for (var j = 0; j < 8; j++) {
            crc16_result = crc16_result & 0x0001 ? (crc16_result >> 1) ^ 0xA001 : crc16_result >> 1;
        }
    }
    return crc16_result;
};

function bytesToInt(array, p, size)
{
    var value = 0;
    for (var i = p; i <= p + size - 1; i++) {
        value = (value * 256) + array[i];
    }
    return value;
};

/*
//  not used
bytesToString = function (buf)
{
    var s = "";
    for (var i = 0, l = buf.length; i < l; i++)
        s += String.fromCharCode(buf[i]);

    return s;
};
*/

function stringToBytes(str)
{
    var bytes = [];
    for (var i = 0; i < str.length; ++i)
    {
        var charCode = str.charCodeAt(i);
        /*
         if (charCode > 0xFF)  // char > 1 byte since charCodeAt returns the UTF-16 value
         {
         throw new Error('Character ' + String.fromCharCode(charCode) + ' can\'t be represented by a US-ASCII byte.');
         }
         */
        bytes.push(charCode);
    }
    return bytes;
};

// --- End ------------------------------------------------------------
