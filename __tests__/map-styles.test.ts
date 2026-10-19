import { MAP_STYLE_IDS, MAP_STYLES, mapStyleNoTiles } from "@/constants/mapStyle";

/**
 * The map is the one place the app reaches a third party for the sake of a picture, and the
 * privacy policy names exactly one host for it. A vendored style is JSON nobody reads line by
 * line, so this is the reader: every string in every style, and the ground it paints.
 */

const HOST = "tiles.openfreemap.org";

/** Every string in a value, however deep: arrays and objects included. */
function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value !== null && typeof value === "object") return Object.values(value).flatMap(strings);
  return [];
}

const urlsOf = (style: unknown) => strings(style).filter((s) => s.includes("://"));

describe("the map styles", () => {
  test.each([...MAP_STYLE_IDS])("%s names only the one tile host, over https", (id) => {
    for (const raw of urlsOf(MAP_STYLES[id])) {
      // `{z}/{x}/{y}` and `{fontstack}` are templates, not part of the host.
      const url = new URL(raw.replace(/[{}]/g, "_"));
      expect(url.protocol).toBe("https:");
      expect(url.host).toBe(HOST);
    }
  });

  test("the style with no tiles has nothing to fetch at all", () => {
    expect(urlsOf(mapStyleNoTiles)).toEqual([]);
    expect(Object.keys(mapStyleNoTiles.sources ?? {})).toEqual([]);
  });

  test("the vendored styles do reach the host, so the test above is looking at something", () => {
    for (const id of ["dark", "fiord"] as const) {
      expect(urlsOf(MAP_STYLES[id]).length).toBeGreaterThan(3);
    }
  });

  /** Relative luminance of `#rrggbb` or `rgb(r,g,b)`; anything else fails so a re-vendor is read. */
  function luminance(color: string): number {
    const hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color);
    const rgb = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/.exec(color);
    const parts = hex
      ? hex.slice(1).map((h) => Number.parseInt(h, 16))
      : rgb
        ? rgb.slice(1).map(Number)
        : null;
    if (parts === null) throw new Error(`unreadable ground colour: ${color}`);
    const [r = 0, g = 0, b = 0] = parts.map((c) => {
      const v = c / 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  test.each([...MAP_STYLE_IDS])("%s is dark: the app has no light mode", (id) => {
    const ground = MAP_STYLES[id].layers.find((layer) => layer.type === "background");
    const color = ground && "paint" in ground ? ground.paint?.["background-color"] : undefined;
    expect(typeof color).toBe("string");
    expect(luminance(String(color))).toBeLessThan(0.2);
  });
});
