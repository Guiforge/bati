import fs from "node:fs";

import { gameIconAuthors, type Lock, productionPackages } from "@/scripts/licenses-lib";
import notices from "@/src/licenses.json";

const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8")) as Lock;
const byName = (name: string) => notices.packages.filter((p) => p.name === name);

describe("third-party notices (A1)", () => {
  test("cover exactly the production tree of the lockfile", () => {
    // Fails after a dependency is added, removed or bumped: `npm run licenses` regenerates it.
    const want = productionPackages(lock).map((p) => `${p.name}@${p.version}`);
    const have = notices.packages.map((p) => `${p.name}@${p.version}`);
    expect(have).toEqual(want);
  });

  test("lists each name@version once (the screen uses it as the row key)", () => {
    const keys = notices.packages.map((p) => `${p.name}@${p.version}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test("every package carries a known licence and the text of it", () => {
    for (const p of notices.packages) {
      expect(`${p.name}: ${p.license}`).not.toMatch(/UNKNOWN|UNLICENSED/);
      expect(p.notices.length).toBeGreaterThan(0);
      for (const n of p.notices) {
        expect(notices.texts[n.text]?.length).toBeGreaterThan(100);
      }
    }
  });

  test("stays text: a ratchet on the asset size, raise it only for a reason", () => {
    expect(fs.statSync("src/licenses.json").size).toBeLessThan(600_000);
  });
});

describe("fonts (A4)", () => {
  test.each(["alegreya", "inter", "noto-sans"])("%s ships its OFL text and copyright", (font) => {
    const [pkg] = byName(`@expo-google-fonts/${font}`);
    expect(pkg?.license).toContain("OFL-1.1");
    const all = pkg?.notices.map((n) => notices.texts[n.text]).join("\n") ?? "";
    expect(all).toMatch(/SIL OPEN FONT LICENSE Version 1\.1/);
    expect(pkg?.notices.flatMap((n) => n.copyright).join("\n")).toMatch(/Copyright/);
  });
});

describe("Tamagui packages reported UNKNOWN (A3)", () => {
  test.each(["context-menu", "focus-guard", "menu", "native", "toast"])(
    "@tamagui/%s is MIT with Tamagui's own notice",
    (name) => {
      const [pkg] = byName(`@tamagui/${name}`);
      expect(pkg?.license).toBe("MIT");
      expect(pkg?.notices.flatMap((n) => n.copyright).join("\n")).toMatch(/Nate Wienert/);
    },
  );
});

describe("game-icons authors (A10)", () => {
  test("list the authors of the icons useGameIcon really loads", () => {
    const authors = gameIconAuthors(fs.readFileSync("hooks/useGameIcon.ts", "utf8"));
    expect(notices.gameIcons).toEqual(authors);
    expect(authors.map((a) => a.author)).toEqual(
      expect.arrayContaining(["Lorc", "Delapouite", "Caro Asercion"]),
    );
  });
});
