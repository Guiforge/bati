# Design: the recap map belongs to the world

Written 2026-08-31 on branch `v2-gps`, answering the open question added the same day at the
foot of [`gps-without-google.md`](gps-without-google.md), "the map should not break the world".
Status: PROPOSED. Nothing here has ever been rendered, for the reason in
[What remains unverified](#what-remains-unverified).

## Problem statement

The recap screen ends a quest. Everything else on it speaks the app's language: the Void as
ground, gold and ember for what the hero earned, Space Grotesk for the numbers. Then a map
appears with motorway shields, a road hierarchy in four greys, POI pins, house numbers, a
compass rose and a MapLibre logo, and for one screen Bati is a navigation app that happens to
have a dragon in it.

The fix is cheap and it is not code. A MapLibre style is a JSON document: the vector tiles
arrive as raw geometry with attributes, and the style decides every colour, width, dash and
label. The same tiles, the same host, the same network decision from D3, rendered as something
else entirely.

## Constraints

- MIT project on F-Droid. Anything reused must be redistributable and its attribution must be
  written down, not assumed.
- APK ratchet 55 MiB; the build measured 50.16 MiB with MapLibre in. 4.84 MiB of headroom, and
  [`gps-without-google.md`](gps-without-google.md) step 3 already spends its conscience on it:
  "not enough for a second native dependency".
- No new dependencies.
- Dark-only, by rule ([`DESIGN.md`](../../DESIGN.md) § 5 forbids light-theme branching).
- Every colour lives in [`constants/rawColors.ts`](../../constants/rawColors.ts) and nowhere
  else. `.biome/plugins/noRawHexColor.grit` enforces it.
- One screen, one host. The map is the app's only network call, and the GritQL ban on JS
  network APIs is what keeps that from being prose.
- `INTERNET` is still in `blockedPermissions`. Not one tile has ever reached this app.

## Recommendation

**Hand-write a style of about fifteen layers against the OpenMapTiles schema, in the app's own
night palette, as a TypeScript module that imports `rawColors`. Not parchment.**

### Why not parchment

The open question said "cream ground, ink-brown roads, a serif face". That is the right instinct
aimed at the wrong app. Bati is dark-only by rule, and its world is not a tavern map, it is
"desaturated night with gold and ember accents", which is the sentence
[`rawColors.ts`](../../constants/rawColors.ts) wrote about itself when the old electric blue was
thrown out for reading as imported from another app. A cream sheet dropped into the Void is the
same failure with better taste: a second theme, in a rectangle, on one screen. The reader's eye
would find its edges instantly, and edges are what "bolted on" means.

The serif half is dead on mechanics anyway, not on taste. MapLibre does not render a font file,
it renders pre-baked glyph PBFs fetched from the style's `glyphs` URL, and
`https://tiles.openfreemap.org/fonts/` serves Noto Sans Regular and Bold and returns 404 for
anything else (openfreemap issue #10). Baking Cinzel into PBFs means a build step and a second
host to serve them from, which is the one thing the network promise cannot spend.

That constraint turns out to be a gift. The app already ships
`@expo-google-fonts/noto-sans` as its body face. Label the map in Noto Sans Regular and the map
text and the app text are literally the same typeface, for zero bytes and zero risk.

### What the map becomes: ink and ember

Nine decisions, in the order they matter.

**1. The ground is `$bgDark`, the same colour as the screen behind it.** The map has no border,
no corner radius, no card. It bleeds off both sides and fades at the top and bottom under a
`expo-linear-gradient` from `bgDark` to transparent. This is the single largest anti-"bolted on"
move available and it costs nothing: the map stops being an inset panel and becomes the screen.

**2. The map does not move.** `dragPan`, `touchZoom`, `touchRotate`, `touchPitch`,
`doubleTapZoom` all false; the camera fits the trace bounds once and stays. A recap map you can
pan out of is a map you can pan into the next town, which is where a road map lives. Locked, it
is a picture of this run. Free, and it also removes every "did the tile load" edge case from a
screen that has no network guarantee.

**3. `attribution`, `logo` and `compass` are false.** The credit is our own Tamagui line under
the map, in the app's type, which OpenFreeMap explicitly permits for non-standard clients as
long as the text is displayed. See [Licence and attribution](#licence-and-attribution).

**4. Subtract the furniture.** This is the cheapest immersion there is, and it happens by
omission: a hand-written style only draws the layers you write. Gone, by never being written:
`road_oneway` and `road_oneway_opposite` (the arrow sprites), `highway_name_other` and
`highway_name_motorway`, `housenumber`, `poi`, `aerodrome_label`, `aeroway-*`, `boundary_*`,
`railway_*`, `water_name`. OpenFreeMap's own dark style needs 47 layers to be a general-purpose
basemap. A recap of a 5 km run needs about fifteen.

**5. Roads are one ink, not a hierarchy.** One `transportation` line layer, colour
`$borderStrong` at low opacity, width interpolated on zoom only, never on class. No casing, no
inner, no subtle; those three layers per road class exist so a driver can read which road is
faster, and no one on this screen is driving. A motorway drawn the same weight as a lane is the
exact moment the map stops being a road map. Paths and tracks get their own thinner, dashed
layer, because a path is where the hero actually went.

**6. Water is drowned void, not blue.** One new colour, darker and bluer than the ground, so
water reads as depth rather than as the blue every mapping app uses.

**7. Woods are one wash, buildings are one mass.** Wood and park collapse to a single green so
desaturated it is nearly the Void, no outline. Buildings appear above z15 as `$surface` fills
with no stroke, so a town reads as a texture of blocks instead of a street network. Legible
world features on a fantasy map are water, forest and settlement; everything else is noise.

**8. Names, and only the small ones.** The `place` layer filtered to
`suburb`, `village`, `hamlet`, `neighbourhood`, `town`. Noto Sans Regular, uppercase,
`text-letter-spacing` around 0.2em, `$textSecondary`, halo in `$bgDark`. That is
[`DESIGN.md`](../../DESIGN.md)'s "label" recipe (short, uppercase, wide tracking) applied to the
one face the tile host serves. At recap zoom these are the names that fire, and a run past
"CROIX-DAURADE" set in wide small caps reads like a waypoint on a chart. City, state and country
labels are not written at all.

**9. The trace is the only lit thing on the screen.** Drawn in TSX from a `GeoJSONSource`, the
way [`app/dev-map.tsx`](../../app/dev-map.tsx) already draws it, so its colours come from
`rawColors` with no new mechanism. Three layers: a wide `resourceGold` line at low opacity with
a large `line-blur` for the glow, the `resourceGold` stroke itself with round caps and joins,
and two circle pips, `$success` where the hero set out and `$resourceFire` where they stopped.
Everything else on the map is between 4 % and 15 % lightness, so the gold does the work that a
highlight colour is supposed to do and never gets to do on a normal basemap.

### The paper texture, deliberately not shipped

The open question called a translucent paper texture "the cheap second half". It is not cheap
here. In-style it means `background-pattern` or `fill-pattern`, which resolve against the
style's `sprite`, and we have no sprite to serve. The alternative, registering a local image
through maplibre-react-native's `<Images>` and referencing it from `fill-pattern`, is documented
for `iconImage` on symbol layers and unverified for fills in v11.

So: a vignette instead. Two `expo-linear-gradient` overlays darkening the top and bottom edges,
already a dependency, zero bytes, zero network, and it does most of what a texture does, which
is to stop the map looking like a flat digital rectangle.

If it still reads flat once someone can actually see it, a tiling 256x256 8-bit grey grain PNG
is 15 to 25 KB, roughly 0.5 % of the remaining 4.84 MiB. That is affordable. It is just not
affordable *before* anyone has looked at the vignette, and it carries an unverified rendering
path with it. Ceiling named, upgrade path named.

## Rejected alternatives

- **Parchment or treasure-map cream.** A second theme in a dark-only app, and its serif face
  cannot be served by the tile host anyway.
- **Fork OpenFreeMap's `dark` style** (21 KB, 47 layers, MIT repo). Inherits the CC BY 4.0
  design attribution of dark-matter-gl-style, and 32 of its 47 layers would be deleted on day
  one. Deleting someone else's file is more work than writing fifteen layers, and every upstream
  change becomes a merge.
- **Fork OSM Liberty** (43 KB, 111 layers). Same objection, three times the size, and it is a
  light style being dragged into the dark.
- **Adapt MapTiler's Vintage or a CC BY antique style.** CC BY design attribution, written for a
  schema we would have to re-check layer by layer, and it targets the parchment look rejected
  above.
- **A raster style rendered server-side.** No free host for a custom raster style, and it throws
  away the entire reason a vector style is one JSON file.
- **No basemap, trace on a drawn backdrop.** Already rejected as premise P5 in
  [`gps-without-google.md`](gps-without-google.md). It also cannot say "you ran along the
  Garonne", which is the sentence the recap exists to say.
- **Bundle a display font.** MapLibre needs glyph PBFs, not a TTF. Build step plus a second
  host.
- **Hillshade.** OpenFreeMap's only relief data is a Natural Earth raster capped at maxzoom 6,
  useless at recap zoom. VersaTiles serves `hillshade-vectors` on the same host it serves tiles
  from, so this is not a style decision, it is downstream of open question 1 below.

## The tile source and its schema, exactly

A style is written against one schema. Getting this wrong means rewriting every `source-layer`
and every filter, so it is written down here rather than assumed.

| | |
|---|---|
| Host | OpenFreeMap, `tiles.openfreemap.org` |
| TileJSON | `https://tiles.openfreemap.org/planet` |
| Source name in the style | `openmaptiles` (convention, and what every OpenFreeMap style uses) |
| Schema | OpenMapTiles, unmodified, generated by planetiler-openmaptiles |
| Glyphs | `https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf`, Noto Sans Regular and Bold only |
| Sprite | omitted; we draw no icons and no patterns |
| Limits | "no limits on the number of map views or requests", no key, no registration, no cookies, per openfreemap.org |

Source layers this style touches: `water`, `waterway`, `landcover`, `landuse`, `building`,
`transportation`, `place`. Deliberately untouched, and therefore invisible: `transportation_name`,
`poi`, `housenumber`, `boundary`, `aeroway`, `aerodrome_label`, `water_name`, `mountain_peak`,
`park`.

**Decided 2026-08-31: OpenFreeMap, OpenMapTiles schema** — the table above, unchanged, and the
appendix's filters stay valid because they were transcribed from the style OpenFreeMap actually
serves. VersaTiles was chosen first and reversed within the hour, so the reason is written down
rather than left as a silent flip: its draw was serving `hillshade-vectors` from the same host,
which is the only route to terrain that keeps one network destination. That buys relief the
recap does not have today and may never need, and it costs rewriting every `source-layer` and
every filter before a line of the real style exists. Relief is a want; a style that can be
written now is the feature. If terrain ever becomes the thing the map is missing, this is the
decision to reopen, and the cost of reopening it is exactly the cost avoided here.

The framing, kept because it is the reason the decision had to come first:The original framing, kept because it is the reason the decision had to come first: If the host flips to VersaTiles, the schema flips
to Shortbread, where water is `ocean` plus `water_polygons` plus `water_lines`, roads are
`streets`, and buildings are `buildings`. Every layer below would be rewritten. **Choose the
host before writing the style, not after.** The trade is real and not obvious: OpenFreeMap
states no limits and needs no key, while VersaTiles is EU-hosted, ships a CC0 schema that asks
for no attribution of its own, and serves `hillshade-vectors` from the same host, which is the
only way this map ever gets terrain without breaking the one-host promise.

## Where the colours live

`rawColors.ts`, and the style is a **TypeScript module, never a `.json` file**. That is not
tidiness. `noRawHexColor.grit` declares `language js`, so a `.json` file is invisible to it, and
a style shipped as JSON would be several dozen hex literals that no tool in this repo can see.
As a `.ts` module importing `rawColors`, the same rule that governs the rest of the app governs
the map. Suggested home: `constants/mapStyle.ts`, beside the palette it reads.

Two new entries in `rawColors`, and no more:

| Key | Value | Why it cannot be an existing token |
|---|---|---|
| `mapWater` | `#0E1730` | Water must read as depth against `bgDark` (`#0B0F19`). `shadowColor` is too close to read at all; `surface2` is a UI surface and reads as a card lying on the map. |
| `mapWood` | `#101E1B` | The only green in the palette is `success`, which means a state, and `pastelGreen` is a legacy safety-net entry. A wood at recap zoom is a texture, not a status. |

Everything else is reuse, which is the point of having a palette:

- ground: `bgDark`
- roads: `borderStrong`, the app's own hairline colour
- buildings: `surface`
- place labels: `textSecondary`, halo `bgDark`
- the trace: `resourceGold`, with `line-opacity` and `line-blur` for the glow, so the glow needs
  no colour of its own
- start pip `success`, end pip `resourceFire`

## Licence and attribution

Writing the style ourselves is what keeps this section short. Adapting someone else's would add
a CC BY design credit to carry forever.

- **OSM data, ODbL.** Must credit "OpenStreetMap contributors". Non-negotiable, and it is the
  reason the credit line exists at all.
- **OpenFreeMap.** Asks for "OpenFreeMap © OpenMapTiles Data from OpenStreetMap", and says the
  OpenFreeMap word itself may be dropped. Because `attribution={false}` removes MapLibre's own
  widget, openfreemap.org's rule for alternative clients applies: the text must be explicitly
  displayed. Our own line, in our own type, satisfies it.
- **OpenMapTiles.** Code BSD-3-Clause, design CC BY 4.0. We use the schema and none of their
  style design, but the credit above already names them, so there is nothing further to do.
- **MapLibre.** The React Native wrapper is MIT (`node_modules/@maplibre/maplibre-react-native/LICENSE.md`,
  MapLibre contributors plus a retained Mapbox copyright); the Android SDK it pulls,
  `org.maplibre.gl:android-sdk-opengl`, is BSD-2-Clause. Both are already in the tree and past
  the CI licence gate. Neither requires a displayed logo, so `logo={false}` owes nobody
  anything. This is not Mapbox.
- **Noto Sans.** SIL OFL 1.1, served by the host as glyph PBFs. Nothing is redistributed in the
  APK by the map, and the app already bundles the same family under the same licence.
- **Nothing is copied.** No forked style file, no sprite sheet, no icon set, no font binary.
  The only new artefacts are two hex values and about 150 lines of TypeScript.

Concretely, the line under the map becomes something like: *"© OpenMapTiles, © OpenStreetMap
contributors. Tiles from OpenFreeMap. Your route never leaves this phone."* The second sentence
was already planned in `gps-without-google.md` § Screens; the first is the obligation.

## What this costs

| | |
|---|---|
| To build | About 150 lines of TypeScript, one file, plus six props on the `Map` and two gradients. Half a day. |
| APK | Zero. Two hex strings and a style object in the JS bundle, some kilobytes. |
| Network | Strictly less than the default style: no sprite request, no icon fetches, no road-name or POI glyph ranges, fewer layers means fewer tile layers decoded. Same host, same tiles, same permission. |
| To maintain | The schema is the contract, and OpenMapTiles has been stable for years. There is no upstream to merge. The real maintenance risk is the host, not the style. |
| Battery | Fewer layers to draw, and the camera is locked so nothing re-renders after the fit. |

## What remains unverified

Everything visual. `INTERNET` is in `blockedPermissions`, so no tile has ever arrived in this
app and **not one pixel of this design has been seen**. `app/dev-map.tsx` proves the renderer
runs and draws a polyline from the bundle; it proves nothing about a basemap. Treat every colour
below as a value chosen on a desktop monitor, to be re-judged on an OLED at arm's length.

What *is* verified is narrow and worth separating out, because the rest of this section is
guesswork and this part is not: every prop name in the appendix was read out of the installed
`@maplibre/maplibre-react-native` 11.3.7 source, not out of a docs page. `attribution`, `logo`,
`compass`, `dragPan`, `touchZoom`, `touchRotate`, `touchPitch` and `doubleTapZoom` are all real
booleans on `Map`; `CameraProps` is `Partial<CameraStop>`, so `bounds` and `padding`
(`{ top, right, bottom, left }`) are direct props. `compass` already defaults to false, so that
one line is documentation rather than a change. The layer filters are transcribed from the style
JSON OpenFreeMap actually serves. None of that means any of it looks good.

Specifically open:

1. **`line-dasharray` on the OpenGL renderer.** MapLibre RN 11.3.7 pulls
   `org.maplibre.gl:android-sdk-opengl:13.2.0`, and maplibre-native issue #3636 reports dashed
   lines going solid after a style change on exactly that renderer. The dashed path layer sits
   directly on that bug. If it bites, paths become a thinner solid line and lose nothing much.
2. **Dash rhythm scales with line width.** A width interpolated over zoom changes the dash
   spacing as you zoom, so the pattern has to be judged at the recap's actual zoom, not in an
   editor.
3. **Zoom expressions are evaluated at integer zoom levels only** on MapLibre Native.
   Interpolated widths will step rather than glide. Harmless with a locked camera, worth knowing
   before anyone unlocks it.
4. **Omitting `sprite` and, if labels are ever dropped, `glyphs`.** The style spec makes both
   optional. MapLibre Native's tolerance for their absence is untested here.
5. **`text-letter-spacing` at 0.2em on Noto Sans at 11px.** Wide tracking on a small halo'd
   label can shred at low DPI. Unseen.
6. **Whether the map demands `ACCESS_NETWORK_STATE` back** once `INTERNET` is unblocked. Already
   flagged as step 7 in `gps-without-google.md`, and it is a decision rather than a patch,
   because it widens what D3 priced.
7. **What OpenFreeMap logs.** It states no keys, no registration, no cookies, and no request
   limits. Nobody here has confirmed the request logs, and that name goes in the privacy policy.
8. **Tile availability at recap zoom in rural France.** The design's whole aesthetic assumes
   `landcover`, `landuse` and `transportation` are populated where people actually run.
9. **`<Images>` plus `fill-pattern`** for the texture upgrade. Documented for symbol icons,
   unverified for fills.
10. **Whether locking the camera is right.** It is the immersive choice and it may be the wrong
    product choice for someone who wants to see where a turn went. Cheap to reverse, so it ships
    locked and waits for a complaint.

## Appendix: a style fragment

**This has never been rendered.** `INTERNET` is blocked; the fragment below has been type-read
and nothing more. Its filters are transcribed from OpenFreeMap's own served styles, so the
`source-layer` names and predicates are real; every colour, width and zoom stop is a guess made
without seeing a pixel.

Abbreviated to eight layers to show the approach. Layer order is paint order: ground, water,
wood, buildings, roads, path, then labels on top.

```ts
// constants/mapStyle.ts
//
// A TypeScript module rather than a .json asset, deliberately: noRawHexColor.grit declares
// `language js`, so a JSON file's forty hex literals would be invisible to the one rule that
// keeps this app's colours in one place. Here they are imports, and the rule applies.
//
// Written against the OpenMapTiles schema as served by OpenFreeMap. If the tile host changes,
// this file is rewritten, not tweaked: Shortbread names none of these layers the same.
import { rawColors } from "@/constants/rawColors";

const TILES = "https://tiles.openfreemap.org/planet";

// Polygons only. The schema puts polygon and line geometries in the same source layer, and a
// fill layer handed a LineString renders nothing but still costs a pass.
const POLYGON = ["match", ["geometry-type"], ["MultiPolygon", "Polygon"], true, false];
const LINE = ["match", ["geometry-type"], ["LineString", "MultiLineString"], true, false];

export const mapStyle = {
  version: 8,
  glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
  // No `sprite`. We draw no icons and no patterns, and a sprite is the only reason the default
  // styles fetch one more file per map.
  sources: {
    openmaptiles: { type: "vector", url: TILES },
  },
  layers: [
    // The same colour as the screen behind the map, so the map has no edge to find.
    { id: "ground", type: "background", paint: { "background-color": rawColors.bgDark } },

    // Water as depth, not as the blue every other map uses. `brunnel` excludes water inside
    // tunnels, which would otherwise paint a river straight through a hillside.
    {
      id: "water",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "water",
      filter: ["all", POLYGON, ["!=", ["get", "brunnel"], "tunnel"]],
      paint: { "fill-color": rawColors.mapWater },
    },

    // Wood and park collapse into one wash. The schema separates them; a hero reading a recap
    // does not care which is which, and two greens would be two greens to keep in sync.
    {
      id: "wood",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "landcover",
      filter: ["all", POLYGON, ["==", ["get", "class"], "wood"]],
      paint: { "fill-color": rawColors.mapWood, "fill-opacity": 0.8 },
    },

    // Buildings late and faint: a town should read as a texture of masses, never as an outline
    // drawing of a street network. No `fill-outline-color`, which is what makes it a texture.
    {
      id: "buildings",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "building",
      minzoom: 15,
      filter: POLYGON,
      paint: {
        "fill-color": rawColors.surface,
        "fill-opacity": ["interpolate", ["linear"], ["zoom"], 15, 0, 16.5, 0.9],
      },
    },

    // Every road, one ink, one weight family. The default styles split this into motorway,
    // major and minor, each with a casing and an inner, because a driver needs to know which
    // road is faster. Nobody on this screen is driving, and that hierarchy is most of what
    // makes a basemap read as a navigation app.
    {
      id: "roads",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      filter: [
        "all",
        LINE,
        ["match", ["get", "class"], ["motorway", "trunk", "primary", "secondary", "tertiary", "minor", "service"], true, false],
      ],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": rawColors.borderStrong,
        "line-opacity": 0.55,
        "line-width": ["interpolate", ["exponential", 1.4], ["zoom"], 12, 0.5, 16, 3],
      },
    },

    // Paths get their own layer and a dash, because a path is where the hero actually went.
    // NOTE: dashes are the riskiest line here. maplibre-native #3636 reports them going solid
    // on the OpenGL renderer after a style change, and 11.3.7 ships exactly that renderer.
    {
      id: "paths",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      minzoom: 13,
      filter: ["all", LINE, ["match", ["get", "class"], ["path", "track"], true, false]],
      paint: {
        "line-color": rawColors.borderStrong,
        "line-opacity": 0.45,
        "line-width": 1,
        // Lengths are multiples of the line width, not pixels, so this rhythm changes if
        // line-width ever becomes zoom-dependent. It is a constant here for that reason.
        "line-dasharray": [2, 2],
      },
    },

    // Rivers as one stroke. No `waterway` labels: a name floating along a river is furniture.
    {
      id: "waterway",
      type: "line",
      source: "openmaptiles",
      "source-layer": "waterway",
      filter: LINE,
      paint: {
        "line-color": rawColors.mapWater,
        "line-width": ["interpolate", ["linear"], ["zoom"], 12, 1, 17, 5],
      },
    },

    // The only text on the map, and only the small names: suburbs, villages, hamlets. Cities
    // and countries are not written at all, because at a 5 km recap zoom they either do not
    // fire or they shout. Noto Sans is not a choice, it is the only face the host serves as
    // glyph PBFs; it happens to be the app's own body face, which is the coherence win.
    // Wide uppercase tracking is DESIGN.md's "label" recipe, and it is what makes a place name
    // read as a waypoint on a chart rather than a pin on a road map.
    {
      id: "place-labels",
      type: "symbol",
      source: "openmaptiles",
      "source-layer": "place",
      filter: [
        "all",
        ["match", ["geometry-type"], ["MultiPoint", "Point"], true, false],
        ["match", ["get", "class"], ["suburb", "village", "hamlet", "neighbourhood", "town"], true, false],
      ],
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Noto Sans Regular"],
        "text-size": 11,
        "text-transform": "uppercase",
        "text-letter-spacing": 0.2,
        "text-max-width": 8,
      },
      paint: {
        "text-color": rawColors.textSecondary,
        "text-halo-color": rawColors.bgDark,
        "text-halo-width": 1.5,
      },
    },
  ],
} as const;
```

And the screen side, which is where the trace and the framing live:

```tsx
<MapLibreMap
  style={{ flex: 1 }}
  mapStyle={mapStyle}
  // The credit is our own Tamagui line under the map, in the app's type. OpenFreeMap allows
  // this for non-standard clients as long as the text is actually displayed.
  attribution={false}
  logo={false}
  compass={false}
  // A recap map you can pan is a map you can pan into the next town, which is a road map.
  // Locked, it is a picture of this run.
  dragPan={false}
  touchZoom={false}
  touchRotate={false}
  touchPitch={false}
  doubleTapZoom={false}
>
  <Camera bounds={traceBounds} padding={{ top: 48, bottom: 48, left: 24, right: 24 }} />
  {/* Three layers, in this order: glow, stroke, pips. The glow is the same gold at low
      opacity with a wide blur, so it needs no colour of its own. */}
</MapLibreMap>
```

## Next steps

1. Answer open question 1 in `gps-without-google.md` (OpenFreeMap or VersaTiles). The style
   cannot be written twice.
2. Add `mapWater` and `mapWood` to `rawColors.ts`, with the comment explaining why neither can
   be an existing token.
3. Write `constants/mapStyle.ts` against the chosen schema.
4. Look at it. Everything above is a guess until then, and the first five minutes on a real
   phone will overturn at least two of these colours.
