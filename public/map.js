
var map = L.map('map').setView([48.60, 31.40], 6);//12);

var iconCar;
//iconCar = L.divIcon({className: 'leaflet-div-icon'});
//iconCar = L.divIcon({className: 'glyphicon glyphicon-phone'}); // works, but small

iconCar = L.icon({
    //iconUrl: 'car211_128x128.png'
    //iconUrl: 'car211_24x24.png'
    iconUrl: 'car211_64x64.png',
    //iconSize: [64, 64],
    //popupAnchor: [-2, -12],
    //popupAnchor: [-2, -12],
    iconSize: [48, 48],
    popupAnchor: [-2, -8],
    iconAnchor: [24, 24]
    /*
    @see http://leafletjs.com/reference.html#icon
    iconUrl: 'my-icon.png',
    iconRetinaUrl: 'my-icon@2x.png',
    iconSize: [38, 95],
    iconAnchor: [22, 94],
    popupAnchor: [-3, -76],
    shadowUrl: 'my-icon-shadow.png',
    shadowRetinaUrl: 'my-icon-shadow@2x.png',
    shadowSize: [68, 95],
    shadowAnchor: [22, 94]
    */
});

var mapDevices = [];

var socket = io();

socket.on('map message', function (msg) {
    console.log("got  msg: " + msg);
    //console.log('got  msg: ' + msg.type + ' text: ' + msg.text + ' lat: ' + msg.lat + ' lng: ' + msg.lng );    

    /*
    if (msg.type = 'marker') {
        setMarker( msg );
    }
    */    
    
    var arrByDevice = mapDevices[ msg.deviceId ];
    if (!arrByDevice) {
        mapDevices[ msg.deviceId ] = arrByDevice = [];
    } else {
        //  ensure array size
        if (arrByDevice.length >= 10) // 3
        {
            //  REMOVE MARKER, remove 'click' listener
            var killMsg = arrByDevice.pop();
            //map.removeControl(killMsg['objMarker']);
            //killMsg['objMarker'].removeFrom(map);
            var killMarker = killMsg['objMarker'];
            killMarker.off('click', onMarkerClick);
            map.removeLayer( killMarker );
        }
    }
    arrByDevice.unshift( msg );
    
    /*
    //  put markers in reverse order
    for (var i = arrByDevice.length - 1; i >= 1; i--) {
        setMarker( msg, 0.5 );
    }
    */
    
    //  set current marker
    setMarker( msg );
    
    //  fade out previous marker
    if (arrByDevice.length > 1) {
        var updateMarker = arrByDevice[1]['objMarker'];
        updateMarker.setOpacity( 0.5 );
    }
    
});

/**
 * Data comes in such format:
 * 
 *  var objData = {
        type: 'marker', 

        deviceId: deviceId,
        utcDateTime: utcDateTime, // as String

        altitude: mapData['altitude'],
        speed: speed, // unit: km/hr
        heading: mapData['heading'], // unit: degree

        lat: lat, 
        lng: lng
    };
 * 
 * @param {type} msg
 * @returns {undefined}
 */
function setMarker( msg, opacity ) 
{
    var marker = L.marker( [msg.lat, msg.lng], { icon: iconCar, opacity: (opacity) ? opacity : 1.0 } ).addTo(map);
    msg['objMarker'] = marker; // keep marker object
    
    var info;
    info = 'Device: ' + msg.deviceId;
    
    info += '<br/>';
    info += 'lat: ' + msg.lat; 
    info += '<br/>';
    info += 'lng: ' + msg.lng;
    info += '<br/>';
    info += 'altitude: ' + msg.altitude + ' m';
    
    info += '<br/>';
    info += 'Speed: ' + msg.speed + ' km/hr';
    
    //info += '<br/>';
    //info += 'Date: ' + msg.utcDate + ' Time: ' + msg.utcTime;
//    info += '<br/>';
//    info += 'UTC 1: ' + msg.utcDateTime;
//    info += '<br/>';
//    info += 'UTC 2: ' + Date.UTC(msg.utcDateTime);
    
    info += '<br/>';
    //info += 'Local: ' + Date.parse(msg.utcDateTime).toLocaleString(); // doesn't work, OUTPUT:   Local: 1 380 485 979 000
    info += 'Date & time: ' + new Date(msg.utcDateTime).toLocaleString();
    
    //marker.bindPopup( msg.text ).openPopup();
    marker.bindPopup( info );
    
    marker.on('click', onMarkerClick);
}

function onMarkerClick(e) {
        //map.setZoom( 13 );
        //map.setView([msg.lat, msg.lng], 13);
        map.setView([e.latlng.lat, e.latlng.lng], 13);
}

/*
function sendMessage(msg) {
    socket.emit('map message', msg);
    console.log("sent msg: " + msg);
}
*/

/*
 $('form').submit(function () {
 socket.emit('chat message', $('#m').val());
 $('#m').val('');
 return false;
 });
 */

/*
 //Initialize the FeatureGroup to store editable layers
 var drawnItems = new L.FeatureGroup();
 map.addLayer(drawnItems);
 */

$(window).ready(function ()
{
    do_resize();
});

function do_resize()
{
    var $winheight = $(window).height() - 2;

    if ($winheight < 10)
        $winheight = $(document).height() - 2;

    if ($winheight < 10)
        $winheight = 768;

    var $winwidth = $(window).width() - 2;

    if ($winwidth < 10)
        $winwidth = $(document).width() - 2;

    if ($winwidth < 10)
        $winwidth = 1024;

    $("#meditor").width($winwidth);
    //$("#map").width( $winwidth -500);
    $("#map").height($winheight);
}
;

//$(function()  // original line
$(document).ready(function ()
{
    do_resize();
    $(window).bind("resize", function () {
        do_resize();
    });

    var osm, ggr, ggs, ggh, ggt, cad, m100, sat, ynd, yns, ynh, ynp, ynt;

    osm = new L.TileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {attribution: 'gisfile.com &copy; <a rel="nofollow" href="http://gisfile.com">GISFile</a>'}); //, {continuousWorld: false, worldCopyJump: false, attribution: 'ShelS Web Server &copy; by <a rel="nofollow" href="http://shels.com.ua">ShelS Company</a>'});
    ggr = new L.Google('ROADMAP');
    ggs = new L.Google('SATELLITE');
    ggh = new L.Google('HYBRID');
    ggt = new L.Google('TERRAIN');

    ynd = new L.Yandex();
    yns = new L.Yandex('satellite');
    ynh = new L.Yandex('hybrid');
    ynp = new L.Yandex('publicMap');

    map.addLayer(osm);
    var layers = new L.Control.Layers({
        'OpenSreetMap': osm,
        'Google Road': ggr,
        'Google Satellite': ggs,
        'Google Hybrid': ggh,
        'Google Terrain': ggt,
        'Yandex Map': ynd,
        'Yandex Satellite': yns,
        'Yandex Hybrid': ynh,
        'Yandex Public': ynp
    });
    map.addControl(layers);
    
    L.control.mousePosition({emptyString: ''}).addTo(map);
    L.control.locate({icon: 'fa fa-location-arrow', strings: {}}).addTo(map); // @see https://github.com/domoritz/leaflet-locatecontrol#possible-options

});
