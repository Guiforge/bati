import fs from "node:fs";
import path from "node:path";

// Audit B6: the light-combat content (K-01) must not borrow somebody's trademark or promise a
// class or a self-defence course. Tae Bo (registered US and CA), BODYCOMBAT (Les Mills) and
// Boxercise (registered UK and EU) are protected names; "kickboxing class" and "self-defence"
// make a claim the app cannot back. The roadmap's rule, made to fail instead of to be remembered.
const FORBIDDEN: [string, RegExp][] = [
  ["Tae Bo", /\btae[ -]?bo\b/i],
  ["BODYCOMBAT", /\bbody[ -]?combat\b/i],
  ["Boxercise", /\bboxercise\b/i],
  ["kickboxing class", /\bkick-?boxing class/i],
  ["self-defense", /\bself[- ]defen[cs]e\b|\bself-défense\b|\bautodéfense\b/i],
];

function files(dir: string, ext: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(ext))
    .map((f) => path.join(dir, f));
}

// Read-only: fastlane/ holds the store listing, which the same rule covers.
const listing = (
  fs.existsSync("fastlane/metadata")
    ? fs.readdirSync("fastlane/metadata/android", { recursive: true, encoding: "utf8" })
    : []
)
  .filter((f) => f.endsWith(".txt"))
  .map((f) => path.join("fastlane/metadata/android", f));

const sources = [...files("locales", ".json"), ...files("drizzle", ".sql"), ...listing];

test("the scan sees the content it is meant to guard", () => {
  expect(sources.length).toBeGreaterThan(10);
});

test.each(FORBIDDEN)("no content says %s", (_name, pattern) => {
  const hits = sources.filter((f) => pattern.test(fs.readFileSync(f, "utf8")));
  expect(hits).toEqual([]);
});

test("the patterns catch what they are for", () => {
  const samples = [
    "Tae-Bo",
    "Body Combat",
    "BODYCOMBAT",
    "boxercise",
    "Kickboxing class",
    "self-defense",
    "self-défense",
  ];
  for (const s of samples) expect(FORBIDDEN.some(([, re]) => re.test(s))).toBe(true);
  expect(FORBIDDEN.some(([, re]) => re.test("a boxing round, a bag, a heavy day"))).toBe(false);
});
