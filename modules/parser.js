var _ = require('underscore');
var log = require('../modules/log')(module);

var parser = {};
parser.strings = {
    NO_VALUE: '<no value>',
    NO_PARAM: 'unknown'
};

parser.isProperInput = function (data) {
    if (!_.isString(data)) {
        throw new Error( 'Data is not of String type.' );
    }
    return true;
}

parser.detectVendor = function (data) {
    
    var isProper = false;
    try {
        isProper = parser.isProperInput(data);
    } catch (e) {
        log.error(e);
    }
    if (!isProper) {
        return undefined;
    }
    
    if (data.length >= 15 && data.length <= 17) {
		return 'IMEI';
	} else if (data.lastIndexOf('!') == data.length - 1) {
        return 'GlobalSat';
    }
	
	//console.log( data);    
    return undefined;
}

parser.parse = function (data, buffer) 
{
    var vendor = parser.detectVendor( data);
    
    if (vendor == 'IMEI') {
	    return parser.checkIMEI( data);
    } else if (vendor == 'GlobalSat') {
	    return parser.parseGlobalSat( data);
    } else if (data.length > 15) {
	    return parser.parseTeltonika( buffer);
	}
	
	log.error( 'Unknown data format, supported formats are: "GlobalSat". Parsing cancelled.' );
	return null;
}

	// --- GlobalSat GPS ------------------------------------------------------------

	parser.parseGlobalSat = function (data) 
	{
		//  for 'GlobalSat' only
		var arrParsedMaps = [];
		
		//  slice data string in multiple packets, if any.
		var packets = data.split( '!' );
		//  always suppress last part as it's just an empty string
		if (packets[packets.length-1] == '') {
			packets.pop();
		}
		log.info( 'found ' + packets.length + ' packets in data string.' );

		if (packets.length == 0) {
			log.error( 'Data packets in proper format not found, parsing cancelled.' );
			return null;
		}
		
		//  GlobalSat format:
		//  IMEI играет роль серийного номера аппарата и передаётся в эфир при авторизации в сети. 
		//  IMEI используется только для идентификации устройства и не имеет постоянного отношения к абоненту. Вместо него используется номер IMSI, хранящийся на SIM-карте
		var REPORT_TEMPLATE = "dataType,IMEI,alarmStatus,reportType,xField,jointIOStatus,gpsFix,utcDate,utcTime,longitude,latitude,altitude,speedKnots,heading,satellites,hdop,batteryVoltage,batteryCapacity,analogInput0,counter0,counter1,counter2,counter3,odometer,geofenceDistance";
		var arrParamNames = REPORT_TEMPLATE.split( ',' );
		//log.debug('number of supported params: ' + arrParamNames.length);
		
		//  TODO:   verify checksum !!
		for (var index in packets) {   //  returns index of array item

			var strDataPacket = packets[ index ];
			var arrParamValues = strDataPacket.split( ',' );
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
					mapParams[ parser.strings.NO_PARAM + i ] = arrParamValues[i].trim();
				} else {
					//mapParams[ arrParamNames[i].trim() ] = arrParamValues[i].trim();
					mapParams[ arrParamNames[i].trim() ] = (i < arrParamValues.length) ? arrParamValues[i].trim() : parser.strings.NO_VALUE;
				}
			}
			
			var lat = parser.ensureDecimal( mapParams['latitude'] );
			var lng = parser.ensureDecimal( mapParams['longitude'] );
			
			mapParams['latitude'] = lat;
			mapParams['longitude'] = lng;
			
			var utcDateTime = parser.ensureUtc( mapParams['utcDate'], mapParams['utcTime']);
			mapParams['utcDateTime'] = utcDateTime;
			
			var speed = parseFloat(mapParams['speedKnots']) * 1.852;
			mapParams['speed'] = speed;
						
			//log.debug( 'map built: ' + mapParams.toString() );
			arrParsedMaps.push( mapParams );
			
		}
		//log.debug( 'Parsing completed: ' + arrParsedMaps.toString() );
		return arrParsedMaps;
	}

	parser.ensureDecimal = function (strValue) 
	{
		var res = '';
		try {
			res = parser.convert2decimal(strValue);
		} catch (e) {
			log.error(e);
		}
		return res;
	}    

	/**
	 * expected format:    E03408.0595,N4427.3934
	 * 
	 * @param {type} strValue
	 * @returns {String}
	 */
	parser.convert2decimal = function (strValue) 
	{
		if (_.isEmpty(strValue)) {
			throw new Error( 'Can\'t convert empty string into decimal coords value.' );
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
		res = parseFloat( strValue.substr(1) );
		res = Math.round(res / 100) + ((res / 100) - Math.round(res / 100)) / 0.6;    
		
		var leadMark = strValue.substr(0,1).toUpperCase();
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
				throw new Error( 'String must be starting with either of: "E", "W", "N", "S".' );
		}
		
		return res.toString();
	}

	parser.ensureUtc = function (strDate, strTime) 
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
			var month = parseInt( strDate.substr(2, 2) ) - 1;
			//var utcDateTime = new Date( '20'+strDate.substr(4, 2), month, strDate.substr(0, 2), strTime.substr(0, 2), strTime.substr(2, 2), strTime.substr(4, 2) );
			var utcDateTime = Date.UTC( '20'+strDate.substr(4, 2), month, strDate.substr(0, 2), strTime.substr(0, 2), strTime.substr(2, 2), strTime.substr(4, 2) );
		} catch (e) {
			log.error(e);
			return null;
		}
		//return utcDateTime.toUTCString(); // no such method
		return utcDateTime;
	}    

	// --- BiTrek GPS ------------------------------------------------------------

	parser.checkIMEI = function (data) {
		if (data.length > 15) {
			data = data.substr( 2);
			parser.IMEI = data;
		}
	
		return data;
	}
	
	parser.parseTeltonika = function (data) 
	{
        //console.log( data);
		'353173060059662'
		var buf;
		
		if (data instanceof Buffer) {
		    buf = data;
		} else {
			buf = parser.stringToBytes( data);
		}
		
		//console.log( buf, data);
		var gps = [];
		
		var sizeAVL = parser.bytesToInt(buf, 4, 4);
		var rCRC = parser.bytesToInt(buf, buf.length -4, 4);
		var cCRC = parser.crc16_teltonika( buf, 8, sizeAVL);

		//console.log( buf, buf[ buf.length -4], buf[ buf.length -3], buf[ buf.length -2], buf[ buf.length -1]);
		//console.log( sizeAVL, buf.length -4*3);
		//console.log( rCRC, cCRC);
		var i = 8;

		if (sizeAVL == buf.length -4*3 && rCRC == cCRC) 
		{
			var codec = parser.bytesToInt(buf, i, 1);
			i++;
			var recs = parser.bytesToInt(buf, i, 1);
			i++;
			//console.log( codec, recs);
			
			if (codec == 0x08) 
			{
				for(var n=0; n<recs; n++) 
				{
					var position = {};
					
					position.timestamp = parser.bytesToInt(buf, i, 8);
					i += 8;
					
					position.preority = parser.bytesToInt(buf, i, 1);
					i++;
					
					position.lng = parser.bytesToInt(buf, i, 4) / 10000000.0;
					i += 4;

					position.lat = parser.bytesToInt(buf, i, 4) / 10000000.0;
					i += 4;

					position.alt = parser.bytesToInt(buf, i, 2);
					i += 2;
					
					position.dir = parser.bytesToInt(buf, i, 2);
					position.direction = 0;
					i += 2;
					
					if (position.dir < 90) position.direction = 1;
					else if (position.dir == 90) position.direction = 2;
					else if (position.dir < 180) position.direction = 3;
					else if (position.dir == 180) position.direction = 4;
					else if (position.dir < 270) position.direction = 5;
					else if (position.dir == 270) position.direction = 6;
					else if (position.dir > 270) position.direction = 7;

					position.satellite = parser.bytesToInt(buf, i, 1);
					i++;
					
					position.status = "";
					position.alarm = "";
					
					if (position.satellite >= 3)
						position.status = "A";
					else
						position.status = "L";
					
					position.speed = parser.bytesToInt(buf, i, 2);
					i += 2;

					position.ioEvent = parser.bytesToInt(buf, i, 1);
					i++;
					
					position.ioCount = parser.bytesToInt(buf, i, 1);
					i++;      
					
					//read 1 byte
					{
						var cnt = parser.bytesToInt(buf, i, 1);
						i++;
						for (var j = 0; j < cnt; j++)
						{
							var id = parser.bytesToInt(buf, i, 1);
							i++;
							//Add output status
							switch (id)
							{
								case ACC:
									{
										var value = parser.bytesToInt(buf, i, 1);
										position.status += value == 1 ? ",ACC off" : ",ACC on";
										i++;
										break;
									}
								case DOOR:
									{
										var value = parser.bytesToInt(buf, i, 1);
										position.status += value == 1 ? ",door close" : ",door open";
										i++;
										break;
									}
								case GSM:
									{
										var value = parser.bytesToInt(buf, i, 1);
										position.status += string.Format(",GSM {0}", value);
										i++;
										break;
									}
								case STOP:
									{
										var value = parser.bytesToInt(buf, i, 1);
										position.stopFlag = value == 1;
										position.isStop = value == 1;
										i++;
										break;
									}
								case IMMOBILIZER:
									{
										var value = parser.bytesToInt(buf, i, 1);
										position.alarm = value == 0 ? "Activate Anti-carjacking success" : "Emergency release success";
										i++;
										break;
									}
								case GREEDRIVING:
									{
										var value = parser.bytesToInt(buf, i, 1);
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
						var cnt = parser.bytesToInt(buf, i, 1);
						i++;
						for (var j = 0; j < cnt; j++)
						{
							var id = parser.bytesToInt(buf, i, 1);
							i++;

							switch (id)
							{
								case Analog:
									{
										var value = parser.bytesToInt(buf, i, 2);
										if (value < 12)
											position.alarm += string.Format("Low voltage", value);
										i += 2;
										break;
									}
								case SPEED:
									{
										var value = parser.bytesToInt(buf, i, 2);
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
						var cnt = parser.bytesToInt(buf, i, 1);
						i++;
						for (var j = 0; j < cnt; j++)
						{
							var id = parser.bytesToInt(buf, i, 1);
							i++;

							switch (id)
							{
								case TEMPERATURE:
									{
										var value = parser.bytesToInt(buf, i, 4);
										position.alarm += string.Format("Temperature {0}", value);
										i += 4;
										break;
									}
								case ODOMETER:
									{
										var value = parser.bytesToInt(buf, i, 4);
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
						var cnt = parser.bytesToInt(buf, i, 1);
						i++;
						for (var j = 0; j < cnt; j++)
						{
							var id = parser.bytesToInt(buf, i, 1);
							i++;

							var io = parser.bytesToInt(buf, i, 8);
							position.status += string.Format(",{0} {1}", id, io);
							i += 8;
						}
					}
			
					if (position.lng != 0 || position.lat != 0) {
						var resData = {IMEI: parser.IMEI, utcDateTime: position.timestamp, latitude: position.lat, longitude: position.lng, altitude: position.alt, heading: 0, speed: position.speed};
						console.log( resData, position);
						gps.push( resData);
					}
				}
			}
			
			//console.log( gps);
			return gps;
		}
		
		return null;
	}

	parser.crc16_teltonika = function (data, p, size)
	{
		var crc16_result = 0x0000;
		for(var i=p; i< p+size; i++)
		{
			var val = 1 *(data[ i]); // +i);
			crc16_result ^= val;
			for (var j = 0; j < 8; j++) {
				crc16_result = crc16_result & 0x0001 ? (crc16_result >> 1)^0xA001 : crc16_result >> 1;
			}
		}
		return crc16_result;
	}

	parser.bytesToInt = function (array, p, size) 
	{
		var value = 0;
		for ( var i = p; i <= p +size -1; i++) {
			value = (value * 256) + array[i];
		}
		return value;
	};

	parser.bytesToString = function (buf)
	{
		var s = "";
		for(var i=0,l=buf.length; i<l; i++)
			s += String.fromCharCode(buf[i]);

		return s;
	}

	parser.stringToBytes = function (str)
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
	}
	
	// --- End ------------------------------------------------------------
	
module.exports = parser;