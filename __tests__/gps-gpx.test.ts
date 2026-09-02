import type { LocationFix } from "@/modules/bati-location";
import { toGpx } from "@/src/gps/gpx";

const fix = (over: Partial<LocationFix> = {}): LocationFix => ({
  t: Date.UTC(2026, 7, 31, 15, 2, 52),
  lat: 48.472781,
  lon: -2.494307,
  ele: 114.6,
  acc: 4,
  speed: 2.5,
  distFromPrev: 0,
  ...over,
});

describe("src/gps/gpx", () => {
  // Same rule as the drawn trace: a single <trkseg> across a ten minute hole claims, in every
  // app that opens this file, that the hero walked through it.
  test("a hole in time opens a new track segment", () => {
    const xml = toGpx(
      [
        fix({ t: 0, distFromPrev: 0 }),
        fix({ t: 1000 }),
        fix({ t: 1000 + 10 * 60_000, distFromPrev: 150 }),
      ],
      { name: "tunnel" },
    );

    expect(xml.match(/<trkseg>/g)).toHaveLength(2);
    expect(xml.match(/<\/trkseg>/g)).toHaveLength(2);
  });

  test("every trkpt carries a time — a file without them imports as a shape with no pace", () => {
    const xml = toGpx([fix(), fix({ t: Date.UTC(2026, 7, 31, 15, 2, 53) })], { name: "t" });
    const points = xml.match(/<trkpt/g) ?? [];
    const times = xml.match(/<time>/g) ?? [];
    expect(points).toHaveLength(2);
    expect(times).toHaveLength(2);
  });

  test("children follow the XSD order: ele, then time, then extensions", () => {
    const xml = toGpx([fix()], { name: "t" });
    expect(xml.indexOf("<ele>")).toBeLessThan(xml.indexOf("<time>"));
    expect(xml.indexOf("<time>")).toBeLessThan(xml.indexOf("<extensions>"));
  });

  test("the extension prefix is gpxtpx, which is what Garmin reads", () => {
    const xml = toGpx([fix()], { name: "t" });
    expect(xml).toContain("gpxtpx:TrackPointExtension");
    expect(xml).not.toContain("ns3:");
  });

  // A longitude near the meridian rendered as `1e-7` parses as text and lands the track in the
  // Gulf of Guinea. toFixed never produces an exponent; the default toString does.
  test("coordinates never render in exponent form", () => {
    const xml = toGpx([fix({ lon: 0.0000001, lat: 0.0000002 })], { name: "t" });
    expect(xml).not.toMatch(/e-\d/);
    expect(xml).toContain('lon="0.000000"');
  });

  test("a fix with no altitude simply has no ele, rather than an empty one", () => {
    const xml = toGpx([fix({ ele: null })], { name: "t" });
    expect(xml).not.toContain("<ele>");
    expect(xml).toContain("<time>");
  });

  test("the track name is escaped, so an ampersand cannot break the document", () => {
    const xml = toGpx([fix()], { name: "Rock & Roll <run>" });
    expect(xml).toContain("Rock &amp; Roll &lt;run&gt;");
  });

  test("Bati's own distance rides along, so a comparison has both numbers in one file", () => {
    expect(toGpx([fix()], { name: "t", totalDistanceM: 5234.7 })).toContain(
      "<desc>Bati distance: 5235 m</desc>",
    );
  });
});
