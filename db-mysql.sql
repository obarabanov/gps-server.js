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