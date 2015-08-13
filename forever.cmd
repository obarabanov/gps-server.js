Tested locally on Windows:
--------------------------

C:\Users\alex\Documents\_repos\GIS\_git\GISfile\web\node.js\geo-tracking>
forever start -a -l logs/forever.log -o logs/out.log -e logs/err.log server.js


Tested on Gisfile.com:
----------------------

tested OK under nicks:	forever start -a -l /var/gps/logs/forever.log -o logs/out.log -e logs/err.log server.js

tested OK under nicks:	forever stopall
tested OK under nicks:	cd /var/gps 
			forever stop server.js


failed under nicks:	forever start -a -l /var/gps/logs/forever.log -o /var/gps/logs/out.log -e /var/gps/logs/err.log /var/gps/server.js

failed under nicks:	forever start -a -l /var/gps/logs/forever.log -o /var/gps/logs/out.log -e /var/gps/logs/err.log /var/gps/server.js --watch --watchDirectory /var/gps --watchIgnore /var/gps/logs


?? 	forever start -a -l /var/gps/logs/forever.log -o logs/out.log -e logs/err.log server.js --watch --watchIgnore /var/gps/logs
