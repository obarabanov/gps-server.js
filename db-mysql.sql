DROP TABLE IF EXISTS `geometries`;
CREATE TABLE `geometries` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `created` datetime DEFAULT NULL,
  `deleted` tinyint(1) DEFAULT NULL,
  `geometry` geometry NOT NULL,
  `propertyA` double DEFAULT NULL,
  `propertyB` double DEFAULT NULL,
  `propertyC` double DEFAULT NULL,
  `_TIMESTAMP` datetime DEFAULT NULL,
  `type` varchar(255) DEFAULT NULL,
  `creator_id` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FKC278490CA576F70` (`creator_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

--
-- Definition of table `gps`
--

DROP TABLE IF EXISTS `gps`;
CREATE TABLE `gps` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `number` varchar(50) DEFAULT NULL,
  `gps_type` bigint(20) DEFAULT NULL,
  `data_type` int(11) DEFAULT NULL,
  `enabled` tinyint(1) DEFAULT NULL,
  `created` datetime DEFAULT NULL,
  `deleted` tinyint(1) DEFAULT NULL,
  `_timestamp` datetime DEFAULT NULL,
  `creator_id` bigint(20) DEFAULT NULL,
  `file_id` bigint(20) DEFAULT NULL,
  `name` varchar(250) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_GPS_NUMBER` (`number`),
  KEY `FK_GPS_USER` (`creator_id`)
) DEFAULT CHARSET=utf8;

--
-- Definition of table `gps_data`
--

DROP TABLE IF EXISTS `gps_data`;
CREATE TABLE `gps_data` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `gps_id` bigint(20) DEFAULT NULL,
  `message` varchar(255) DEFAULT NULL,
  `geometry_id` bigint(20) DEFAULT NULL,
  `created` datetime DEFAULT NULL,
  `deleted` tinyint(1) DEFAULT NULL,
  `_timestamp` datetime DEFAULT NULL,
  `creator_id` bigint(20) DEFAULT NULL,
  `number` varchar(50) DEFAULT NULL,
  `alarmStatus` smallint(3) DEFAULT NULL,
  `xField` varchar(15) DEFAULT NULL,
  `jointIOStatus` varchar(15) DEFAULT NULL,
  `gpsFix` tinyint(1) DEFAULT NULL,
  `utcTime` datetime DEFAULT NULL,
  `longitude` double DEFAULT NULL,
  `latitude` double DEFAULT NULL,
  `altitude` double DEFAULT NULL,
  `speed` double DEFAULT NULL,
  `heading` smallint(3) unsigned DEFAULT NULL,
  `satellites` tinyint(1) DEFAULT NULL,
  `hdop` double DEFAULT NULL,
  `batteryVoltage` varchar(15) DEFAULT NULL,
  `batteryCapacity` varchar(15) DEFAULT NULL,
  `analogInput0` double DEFAULT NULL,
  `counter0` double DEFAULT NULL,
  `counter1` double DEFAULT NULL,
  `counter2` double DEFAULT NULL,
  `counter3` double DEFAULT NULL,
  `odometer` double DEFAULT NULL,
  `geofenceDistance` double DEFAULT NULL,
  `reportType` varchar(1) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_GPS_DATA` (`gps_id`,`utcTime`) USING BTREE
) DEFAULT CHARSET=utf8; 
