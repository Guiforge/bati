import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * The floating figure belongs to the Village, the one screen with a painting to stand on. Every
 * other screen gets a line in its flow (VillagerLine), which by construction sits on top of
 * nothing. The overlay that drew over every route was what let a tap on the figure rate a session
 * "Too Easy" unseen, so the way back to it is closed by a test, not by a comment.
 */

const ROOT = join(__dirname, "..");
const SKIP = new Set(["node_modules", ".git", ".expo", "android", "ios", "__tests__", ".claude"]);

function sources(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...sources(path));
    else if (/\.(ts|tsx)$/.test(name)) out.push(path);
  }
  return out;
}

const ALLOWED = new Set([
  join("components", "village", "VillageScene.tsx"),
  join("components", "chorus", "VillagerCameo.tsx"),
]);

describe("the floating villager", () => {
  it("is rendered by the Village scene and by nothing else", () => {
    const offenders = sources(ROOT)
      .map((file) => file.slice(ROOT.length + 1))
      .filter((file) => !ALLOWED.has(file))
      .filter((file) => /\bVillagerCameo\b/.test(readFileSync(join(ROOT, file), "utf8")));

    expect(offenders).toEqual([]);
  });

  it("is rendered by the Village scene inside the hero painting, above the cards", () => {
    const scene = readFileSync(join(ROOT, "components", "village", "VillageScene.tsx"), "utf8");
    // The hero layers are a fragment built above the render (L6-T21), then placed in the painting.
    const layers = scene.indexOf("const heroLayers");
    const cameo = scene.search(/<VillagerCameo\b/);
    // Placed twice since T45: on the iso map, then in the painting; the painting's is the last.
    const placed = scene.lastIndexOf("{heroLayers}");
    // The list is one `panel`, built above the render and placed under the painting (or in the drawer).
    const cards = scene.lastIndexOf("{panel}");
    expect(layers).toBeGreaterThan(-1);
    expect(cameo).toBeGreaterThan(layers);
    expect(placed).toBeGreaterThan(cameo);
    expect(scene.indexOf('testID="village-hero"')).toBeLessThan(placed);
    expect(cards).toBeGreaterThan(placed);
  });

  it("is not mounted at the root, and the root no longer watches every touch", () => {
    const layout = readFileSync(join(ROOT, "app", "_layout.tsx"), "utf8");
    expect(layout).not.toMatch(
      /VillagerCameo|dismissVillagerOnTouch|onStartShouldSetResponderCapture/,
    );
  });
});
