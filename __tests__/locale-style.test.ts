import * as fs from "node:fs";
import * as path from "node:path";

// Four rules the locale files drifted on, kept from drifting again.
//
// They are a ratchet, like the permissions test: the fix is to write the string
// correctly, never to widen the rule so a build passes.
//
// 1. One apostrophe. fr.json mixed 18 curly (’) against 378 straight ('), often in
//    the same screen — onboarding.save_error wrote "d’enregistrer" while
//    exercise_editor.save_failed wrote "d'enregistrer". Straight is the form both
//    files now use. Flipping the whole project to ’ later is one sed plus the
//    constant below; mixing the two is what this forbids.
//
// 2. One ellipsis. "Chargement..." and "Lancement…" shipped side by side. The real
//    character wins: three periods are a typewriter workaround.
//
// 3. No em dash, in any language, on any surface a person reads. The rule started
//    narrower: French uses the tiret cadratin for dialogue and, in pairs, to isolate
//    an incise, so the first version of this test counted rather than banned, and
//    exempted English where the medial hinge is correct usage. It was widened by
//    decision, not by drift — the objection was never that the construction is
//    ungrammatical in English, it is that its frequency reads as machine-written
//    whatever any single dash is doing. A comma, a colon, a full stop or a pair of
//    brackets says the same thing and never has to be defended.
//
// 4. One form of address per surface. The app says `tu`; the privacy policy and the
//    safety notices say `vous`, because one is a game speaking to a hero and the
//    other is a document addressing a user. Thirteen strings had drifted across the
//    line, and the GPS work added two more before this was written down. The rule is
//    the allowlist below, and widening it is a decision about which surface a screen
//    belongs to, never a way to land a string.

const ROOT = path.resolve(__dirname, "..");
const LOCALES = path.join(ROOT, "locales");

/**
 * Every file outside `locales/` that a person actually reads: the front page, the policy, the
 * repository's own pages, and the store listing including its published release notes. Add a
 * file here the day a new one starts carrying prose, because nothing else will notice.
 */
function readerFacingFiles(): string[] {
  const listings = fs
    .readdirSync(path.join(ROOT, "fastlane", "metadata", "android"))
    .flatMap((locale) => {
      const dir = path.join("fastlane", "metadata", "android", locale);
      const changelogs = path.join(ROOT, dir, "changelogs");
      return [
        path.join(dir, "full_description.txt"),
        path.join(dir, "short_description.txt"),
        path.join(dir, "title.txt"),
        ...(fs.existsSync(changelogs)
          ? fs.readdirSync(changelogs).map((f) => path.join(dir, "changelogs", f))
          : []),
      ];
    });

  return [
    "README.md",
    "CONTRIBUTING.md",
    "SECURITY.md",
    "docs/legal/index.html",
    "docs/legal/privacy.md",
    ...listings,
  ].filter((f) => fs.existsSync(path.join(ROOT, f)));
}

const APOSTROPHE = "'"; // the form both locale files use; ’ is the banned one here
const BANNED_APOSTROPHE = "’";
const EM_DASH = "—";

type Entry = { key: string; value: string };

function collect(node: unknown, trail: string, out: Entry[]): void {
  if (typeof node === "string") {
    out.push({ key: trail, value: node });
    return;
  }
  if (Array.isArray(node)) {
    for (const [i, child] of node.entries()) {
      collect(child, `${trail}[${i}]`, out);
    }
    return;
  }
  if (node && typeof node === "object") {
    for (const [k, child] of Object.entries(node)) {
      collect(child, trail ? `${trail}.${k}` : k, out);
    }
  }
}

function entriesOf(file: string): Entry[] {
  const out: Entry[] = [];
  collect(JSON.parse(fs.readFileSync(path.join(LOCALES, file), "utf8")), "", out);
  return out;
}

function offenders(file: string, predicate: (value: string) => boolean): string[] {
  return entriesOf(file)
    .filter((e) => predicate(e.value))
    .map((e) => `${file} → ${e.key}: ${e.value.slice(0, 70)}`);
}

describe("locale typography", () => {
  it.each(["fr.json", "en.json"])("%s uses one apostrophe, not two", (file) => {
    expect(offenders(file, (v) => v.includes(BANNED_APOSTROPHE))).toEqual([]);
    // and the chosen one is actually in use, so a future sed cannot silently invert
    // the rule by emptying the file of apostrophes altogether
    expect(fs.readFileSync(path.join(LOCALES, file), "utf8")).toContain(APOSTROPHE);
  });

  it.each(["fr.json", "en.json"])("%s spells an ellipsis with one character", (file) => {
    expect(offenders(file, (v) => v.includes("..."))).toEqual([]);
  });

  it.each(["fr.json", "en.json"])("%s uses no em dash at all", (file) => {
    expect(offenders(file, (v) => v.includes(EM_DASH))).toEqual([]);
  });

  it("no reader-facing file uses an em dash", () => {
    const offending = readerFacingFiles()
      .map((file) => ({ file, text: fs.readFileSync(path.join(ROOT, file), "utf8") }))
      .filter(({ text }) => text.includes(EM_DASH))
      .map(({ file, text }) => {
        const line = text.split("\n").findIndex((l) => l.includes(EM_DASH)) + 1;
        return `${file}:${line}`;
      });

    expect(offending).toEqual([]);
  });
});
