import type { MapProps } from "@maplibre/maplibre-react-native";
import { rawColors } from "@/constants/rawColors";

/**
 * The basemap under a recap, in the app's own night palette. "Ink and ember", not parchment.
 *
 * A TypeScript module rather than a `.json` asset, deliberately: `.biome/plugins/noRawHexColor.grit`
 * declares `language js`, so a JSON style's several dozen hex literals would be invisible to the
 * one rule that keeps this app's colours in one place. Here they are imports, and the rule
 * applies to the map exactly as it applies to every screen.
 *
 * Written against the **OpenMapTiles** schema as served by **OpenFreeMap**. If the tile host ever
 * changes, this file is rewritten and not tweaked: Shortbread names none of these source layers
 * the same. See docs/designs/map-immersion.md, whose appendix this is.
 *
 * What is *not* here is most of the design. A hand-written style only draws the layers it names,
 * so the furniture that makes a basemap read as a navigation app — motorway shields, oneway
 * arrows, house numbers, POI pins, road names, boundaries, railways, airports, water labels — is
 * gone by never being written. OpenFreeMap's own dark style needs 47 layers to be a
 * general-purpose basemap. A recap of a 5 km run needs eight.
 *
 * **Nothing below has ever been rendered.** Every colour, width and zoom stop is a value chosen
 * on a desktop monitor; the filters are transcribed from the styles OpenFreeMap actually serves.
 */

/** MapLibre's own style type, reached through the prop that consumes it rather than through a
 * direct dependency on `@maplibre/maplibre-gl-style-spec`, which this project does not declare. */
type MapStyle = Exclude<MapProps["mapStyle"], string>;
type LayerFilter = NonNullable<Extract<MapStyle["layers"][number], { type: "fill" }>["filter"]>;

const TILES = "https://tiles.openfreemap.org/planet";

/** Noto Sans Regular and Bold are the only faces this host serves, and Noto Sans is already the
 * app's body face — so the map's text and the app's text are literally the same typeface. */
const GLYPHS = "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf";

// Polygons only, and lines only. The schema puts both geometries in the same source layer, and a
// fill layer handed a LineString renders nothing while still costing a pass.
const POLYGON: LayerFilter = ["match", ["geometry-type"], ["MultiPolygon", "Polygon"], true, false];
const LINE: LayerFilter = [
  "match",
  ["geometry-type"],
  ["LineString", "MultiLineString"],
  true,
  false,
];

export const mapStyle: MapStyle = {
  version: 8,
  glyphs: GLYPHS,
  // No `sprite`. We draw no icons and no fill patterns, and a sprite is the only reason the
  // default styles fetch one more file per map.
  sources: {
    openmaptiles: { type: "vector", url: TILES },
  },
  layers: [
    // 1. The same colour as the screen behind the map, so the map has no edge for the eye to
    // find. This one line is the largest anti-"bolted on" move available and it costs nothing.
    {
      id: "ground",
      type: "background",
      paint: { "background-color": rawColors.bgDark },
    },

    // 2. Water as depth, not as the blue every other map uses. `brunnel` excludes water inside
    // tunnels, which would otherwise paint a river straight through a hillside.
    {
      id: "water",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "water",
      filter: ["all", POLYGON, ["!=", ["get", "brunnel"], "tunnel"]],
      paint: { "fill-color": rawColors.mapWater },
    },

    // 3. Wood and grass collapse into one wash, no outline. The schema separates them; a hero
    // reading a recap does not care which is which, and two greens would be two greens to keep
    // in sync.
    {
      id: "wood",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "landcover",
      filter: ["all", POLYGON, ["match", ["get", "class"], ["wood", "grass"], true, false]],
      paint: { "fill-color": rawColors.mapWood, "fill-opacity": 0.8 },
    },

    // 4. Rivers as one stroke, and *above* the wood: a river through a forest is the one thing
    // on this map that says where the hero actually was. No `waterway` labels — a name floating
    // along a river is furniture.
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

    // 5. Buildings late and faint: a town should read as a texture of masses, never as an
    // outline drawing of a street network. No `fill-outline-color`, which is what makes it a
    // texture rather than a plan.
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

    // 6. Every road, one ink, one weight family, interpolated on zoom and never on class. The
    // default styles split this into motorway, major and minor, each with a casing and an inner,
    // because a driver needs to know which road is faster. Nobody on this screen is driving, and
    // that hierarchy is most of what makes a basemap read as a navigation app.
    {
      id: "roads",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      filter: [
        "all",
        LINE,
        [
          "match",
          ["get", "class"],
          ["motorway", "trunk", "primary", "secondary", "tertiary", "minor", "service"],
          true,
          false,
        ],
      ],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": rawColors.borderStrong,
        "line-opacity": 0.55,
        "line-width": ["interpolate", ["exponential", 1.4], ["zoom"], 12, 0.5, 16, 3],
      },
    },

    // 7. Paths get their own thinner, dashed layer, because a path is where the hero actually
    // went. The dash is the riskiest line in this file: maplibre-native #3636 reports dashes
    // going solid on the OpenGL renderer after a style change, and 11.3.7 ships exactly that
    // renderer. If it bites, drop the dash — a thinner solid line loses very little.
    // Dash lengths are multiples of the line width, not pixels, so the rhythm would change if
    // `line-width` ever became zoom-dependent. It is a constant here for that reason.
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
        "line-dasharray": [2, 2],
      },
    },

    // 8. The only text on the map, and only the small names. City, state and country labels are
    // not written at all: at a 5 km recap zoom they either do not fire or they shout. Wide
    // uppercase tracking is DESIGN.md's "label" recipe, and it is what makes a place name read
    // as a waypoint on a chart rather than a pin on a road map.
    {
      id: "place-labels",
      type: "symbol",
      source: "openmaptiles",
      "source-layer": "place",
      filter: [
        "all",
        ["match", ["geometry-type"], ["MultiPoint", "Point"], true, false],
        [
          "match",
          ["get", "class"],
          ["suburb", "village", "hamlet", "neighbourhood", "town"],
          true,
          false,
        ],
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
};

/**
 * The credit, and it is an obligation rather than a courtesy.
 *
 * OSM data is ODbL and must name its contributors; OpenFreeMap asks for "OpenFreeMap ©
 * OpenMapTiles Data from OpenStreetMap" and permits dropping its own name. MapLibre's built-in
 * attribution button is switched off on the recap (`attribution={false}`), and OpenFreeMap's rule
 * for non-standard clients is that the text must then be *explicitly displayed* — which is what
 * this line, rendered in the app's own type under the map, is for. The second sentence is not
 * required by anyone; it is the promise the manifest used to make.
 */
export const MAP_ATTRIBUTION =
  "© OpenMapTiles, © OpenStreetMap contributors. Tiles from OpenFreeMap.";
