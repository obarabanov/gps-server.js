
## Functionality and Features

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
      - <s>BiTrek
      - <s>Teltonika
    - **string (NMEA ?) format:**
      - GlobalSat:
        - <s>reports: GSr
        - config and other packets
      - Elgato Ukr
      - Queclink ?
    - **unclear:**
      - RCS TeleTrack
  - support NMEA format, via existing js module ?
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
  - <s>remove: saving into DB
  - <s>remove: chat.html (socket.io demo)
  - remove: /libs dependencies
  - remove: bower usage and  dependencies ?
- **configuration:**
  - setup project through the package.json
  - arrange npm "scripts"
  - extend configuration support

