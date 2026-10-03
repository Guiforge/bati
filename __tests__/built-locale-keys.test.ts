import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Keys the code builds from a value instead of naming them, so no grep for the literal finds a
 * caller. A dead-code sweep deleted `village.flame_1..5` as "referenced nowhere" while
 * `VillageScene` renders `t(\`village.flame_${scene.flame}\`)`, and every hero with a 3-day flame
 * would have read "village.flame_3" on the Village. Each built key family is listed here with the
 * values its builder can produce, so removing one fails a test instead of a release.
 */
const BUILT: Record<string, readonly string[]> = {
  // components/village/VillageScene.tsx, from getFlameLevel (db/streaks.ts): 1 to 5.
  "village.flame_": ["1", "2", "3", "4", "5"],
};

const LOCALES = ["en", "fr", "de", "es"] as const;

function lookup(tree: unknown, key: string): unknown {
  return key.split(".").reduce<unknown>((node, part) => {
    if (node && typeof node === "object" && part in node) {
      return (node as Record<string, unknown>)[part];
    }
    return undefined;
  }, tree);
}

describe("keys built from a value exist in every locale", () => {
  for (const lang of LOCALES) {
    const tree: unknown = JSON.parse(
      fs.readFileSync(path.join(__dirname, "..", "locales", `${lang}.json`), "utf8"),
    );
    for (const [prefix, values] of Object.entries(BUILT)) {
      it(`${lang}: ${prefix}{${values.join(",")}}`, () => {
        const missing = values.filter((v) => typeof lookup(tree, `${prefix}${v}`) !== "string");
        expect(missing).toEqual([]);
      });
    }
  }
});
