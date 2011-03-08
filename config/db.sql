CREATE TABLE `users` (
  `email` varchar(255) NOT NULL DEFAULT '',
  `name` varchar(255) DEFAULT NULL,
  `password` char(40) DEFAULT NULL,
  `created` datetime DEFAULT NULL,
  `updated` datetime DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

CREATE TABLE `replays` (
  `hash` char(40) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `seed` int(11) DEFAULT NULL,
  `score` int(11) DEFAULT NULL,
  `verified` bit(1) DEFAULT NULL,
  `start` varchar(15) DEFAULT NULL,
  `date` datetime DEFAULT NULL,
  `log` text,
  PRIMARY KEY (`hash`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;