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

- **Map tiles.** The app carries `android.permission.INTERNET` since expeditions landed. The map
  is a setting, off by default; once you switch it on, MapLibre fetches vector tiles (the square
  images a map is made of) natively from `tiles.openfreemap.org`, OpenStreetMap data served by
  OpenFreeMap. The tiles requested are the ones covering the place where the outing happened, so
  that request tells the host roughly where you were, with your IP address and the time. It does
  not carry the route to the metre, the pace, the training or an identity: the points stay in the
  database. With the map off, the app makes no request at all. Nothing else in the app may open a connection, and that is enforced
  rather than promised: [`.biome/plugins/noJsNetwork.grit`](.biome/plugins/noJsNetwork.grit)
  fails the build on `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource` or `sendBeacon`
  anywhere in the JavaScript.
- **The feedback row in Settings**, which opens a `mailto:` draft in your own mail client,
  pre-filled and fully editable. Nothing is transmitted unless you press send yourself.

That is the property most worth protecting in a report: if you find a way for this app to send
data off the device without the user deliberately doing it (a second host, a request from
JavaScript that slipped past the plugin, a route or a database in a tile URL), that is a bug worth
telling me about.

## Known and accepted

One advisory is open against the dependency tree and will stay open, so here is the reasoning
rather than a red badge with no explanation.

`decode-uri-component` at 0.2.2 decodes malformed percent-encoded input at a cost that grows far
faster than the input does (GHSA-vcc3-ghjq-m6fr, fixed upstream in 0.5.0). It arrives through
`query-string`, which arrives through `expo-router` and `@react-navigation`, and it is reachable:
`getStateFromPath` runs it over the query string of an incoming `bati://` deep link. Measured on
the installed copy, 400 malformed tokens cost 3.1 s and 800 cost 13.9 s of Node on a desktop, so a
link of a couple of kilobytes freezes the JavaScript thread on a phone for as long as someone
cares to make it.

What that buys an attacker is the app they got you to open a crafted link with, hanging until you
kill it. No data, no privilege, nothing that outlives the process. The app has no account, no
webview and no inbound links by design, so the only way in is a link handed to the user directly.

There is no fix to take. `expo-router` still pins `query-string@^7`, which still pins the
vulnerable major. Overriding `decode-uri-component` to 0.5.0 does not work: it is ESM only and
`query-string@7` requires it, so under Metro the call site would get a namespace object and every
deep link would crash instead of hang. Overriding `query-string` itself to 9.x would pull the
fixed decoder, and would also swap the library that parses every navigation parameter in the app
across two majors, with no test surface under it. That is a worse trade than the bug.

Revisit when `expo-router` moves off `query-string@7`.
