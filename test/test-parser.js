var assert = require('assert');
var parser = require('../modules/parser');

var data;

data = 'dsfklghkdshj'
assert.equal( undefined, parser.detectVendor( data ) );
assert.notEqual( 'GlobalSat', parser.detectVendor( data ) );

data = '----dgfkdgf--!'
assert.equal( 'GlobalSat', parser.detectVendor( data ) );

data = new Number( 55 );
//assert.ifError( parser.detectVendor( data ) );
try {
    assert.equal( 'some_vendor', parser.isProperInput( data ) );
} catch (e) {
    console.error('Catched in test: ' + e);
}
assert.equal( undefined, parser.detectVendor( data ) );

var packets;
data ='GSr,354660042226111,00,4,c000,c000,3,290813,231939,E03407.9321,N4426.5012,31,0.00,0,6,1.8,12650,12620mV,0,0,0,0,0,21046,0,255,01,5DE0,2BA4*62!';
packets = parser.parse( data );
assert.equal( 1, packets.length );
//assert.equal( 0, packets[1].length );
//assert.equal( '', packets[1] );

//data = 'GSr,354660042226111,00,4,c000,c000,3,290813,184937,E03407.9309,N4426.5083,39,0.00,0,6,1.6,12760,12740mV,0,0,0,0,0,21046,0,255,01,5DE0,2BA4*60!GSr,354660042226111,00,4,c000,c000,3,290813,181937,E03407.9267,N4426.5089,15,0.00,0,9,1.1,12780,12760mV,0,0,0,0,0,21046,0,255,01,5DE0,2BA4*6C!';
data ='GSr,354660042226111,00,4,c000,c000,3,290813,184937,E03407.9309,N4426.5083,39,0.00,0,6,1.6,12760,12740mV,0,0,0,0,0,21046,0,255,01,5DE0,2BA4*60!'
    + 'GSr,354660042226111,00,4,c000,c000,3,290813,181937,E03407.9267,N4426.5089,15,0.00,0,9,1.1,12780,12760mV,0,0,0,0,0!';
packets = parser.parse( data );
assert.equal( 2, packets.length );
//assert.equal( '', packets[2] );

//var map = packets[0];
map2string( packets[0] );
map2string( packets[1] );

//  ------- finish
console.log();
console.log( 'Test passed successfully.' );

function map2string( map ) {
    var strMap = '[';
    var count = 0;
    for (var k in map) { //  works for Objects only.
        strMap += '\n' + k.toString() + ': ' + map[k].toString();// + ', ';
        count++;
    }
    strMap += '\n]';
    console.log('\nMap #0 has '+ count +' values: ' + strMap);
}