
## About

Basically, *gps-server* is aimed to support various GPS hardware devices and different data protocols.
Both binary and string-based protocols can be supported, including NMEA-like ones.

There is a map page available to see your GPS devices tracked in real-time.
Just go to configured HTTP endpoint in your browser.

**TBD:** Also, some admin UI provided to get an idea what's going on under the hood,
with some of logs out to see in real-time in your browser.

Main goals are to keep it:
- lightweight
- extensible
- configurable
- easy-to-use

...and that's it. Simple.

## How to use

### as standalone server

After cloning or downloading this repository, you can run it as standalone server:

```
npm install
node server.js
```

Usually, it's a good idea to use some helper packages, like `forever`. See `server.js` for some more info.

### as npm package
*gps-server* can be used as npm package, in external app.
In your app's folder, do:

`npm install gps-server`

To save dependency in your package.json: `npm install gps-server --save`

Then, in your app just add:
```
var gpsServer = require('gps-server');
//  start GPS server
gpsServer();
```

See `server.js` for usage example.


## Functionality and Features

### @0.3.0

- tested against real GPS devices, workable with:
  - Bitrek / Teltonika binary protocol
  - GlobalSat NMEA-like string protocol
- can be used as npm package now, in external app

### v2015

- server listening for data
- logging of received data -> into file under /log
- parsing GPS data
- UI: map.html, for real-time GPS position rendering
- UI: chat.html (socket.io demo)
- broadcasting socket.io message -> subscribed listeners on UI
- saving data into MySQL DB
- configuration support, limited
- bower used for front-end dependencies
- /libs used
- custom unit tests used
- custom demo.js for demoing / testing

### TODO

- **add:**
  - arrange universal parsing flow using adapters (parsers for specific formats ?)
    - **binary:**
      - ~~BiTrek~~
      - ~~Teltonika~~
    - **string (NMEA ?) format:**
      - GlobalSat:
        - ~~reports: GSr~~
        - config and other packets
      - Elgato Ukr
      - Queclink ?
    - **unclear:**
      - RCS TeleTrack
  - support NMEA format, via existing js module ?
  - introduce 'extension point' to use parsed data
  - unit tests - karma ?
  - stress tests / highload ?
  - support for demo mobile app
  - support for OsmAnd mobile clients ?
  - cloud support / cloud demo (**note:** RH cloud HTTP+TCP ports config issue)
  - UI: parameter support for showing one device or group ?
  - admin UI:
    - page with current / active metrics (# of connected devices and/or UI users)
    - log page (events/usage listing), with e.g. ~1,000 lines max
- **remove:**
  - ~~remove: saving into DB~~
  - ~~remove: chat.html (socket.io demo)~~
  - ~~remove: bower usage, re-arrange dependencies~~
- **configuration:**
  - ~~setup project through the package.json~~
  - ~~arrange npm "scripts"~~
  - extend configuration support
