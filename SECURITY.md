# Security

## Reporting

Email **feedback.bati@proton.me**. Please do not open a public issue for a security problem.

There is no bounty and no formal SLA (this is a personal project), but a report will be read and
answered.

## What the app does with your data

No personal data leaves the device. Bati has no backend, no analytics and no crash-reporting
service. Training history, GPS traces, preferences and the crash log all live in a local SQLite
database, and uninstalling the app destroys them.

Two paths cross the network boundary, and both are worth knowing before you write a report.

- **Map tiles.** The app carries `android.permission.INTERNET` since expeditions landed. MapLibre
  fetches vector tiles natively from `tiles.openfreemap.org`, and that host sees an IP address and
  which squares of the world were asked for, which is what a map costs. It never sees a route: the
  points stay in the database. Nothing else in the app may open a connection, and that is enforced
  rather than promised: [`.biome/plugins/noJsNetwork.grit`](.biome/plugins/noJsNetwork.grit)
  fails the build on `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource` or `sendBeacon`
  anywhere in the JavaScript.
- **The feedback row in Settings**, which opens a `mailto:` draft in your own mail client,
  pre-filled and fully editable. Nothing is transmitted unless you press send yourself.

That is the property most worth protecting in a report: if you find a way for this app to send
data off the device without the user deliberately doing it (a second host, a request from
JavaScript that slipped past the plugin, a route or a database in a tile URL), that is a bug worth
telling me about.
