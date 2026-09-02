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
function sourceFiles(...roots: string[]): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (full.endsWith(".tsx") || full.endsWith(".ts")) out.push(full);
    }
  };
  for (const root of roots) walk(root);
  return out;
}

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

  /**
   * Rule 4. Two surfaces are allowed `vous`: the privacy policy and the safety notices. Every other
   * French string is the game talking to a hero. A plural imperative at the start of a sentence
   * ("Jurez plus bas") is the form that slipped through last, so it is matched alongside the
   * pronouns; the three capitalised words that end in -ez without being verbs are named.
   */
  const VOUS_SURFACES = ["privacy.", "safety."];
  const VOUS = /\b(vous|votre|vos)\b|(?:^|[.!?:] )(?!Chez\b|Assez\b|Nez\b)[A-ZÉ][a-zé]+ez\b/;

  it("fr.json says tu everywhere but the policy and the safety notices", () => {
    const drifted = entriesOf("fr.json")
      .filter((e) => !VOUS_SURFACES.some((prefix) => e.key.startsWith(prefix)))
      .filter((e) => VOUS.test(e.value))
      .map((e) => `${e.key}: ${e.value.slice(0, 70)}`);

    expect(drifted).toEqual([]);
  });

  /**
   * The blind spot the first sweep had: `t("key", "fallback")` puts an English string in a `.tsx`,
   * where neither the locale scan nor the reader-facing one can see it. Ten of them still carried
   * a dash after every locale file was clean, and a fallback is what a hero reads the moment a key
   * goes missing.
   *
   * Only the dash. Asserting that a fallback equals its key would be the stronger rule and it
   * fails today on 33 call sites, which is a real finding and a separate decision: those never
   * render while `i18n-keys.test.ts` holds both files to the same keys.
   */
  it("no inline fallback uses an em dash", () => {
    const offending: string[] = [];

    for (const file of sourceFiles(path.join(ROOT, "app"), path.join(ROOT, "components"))) {
      const source = fs.readFileSync(file, "utf8");
      for (const match of source.matchAll(/t\(\s*"([\w.]+)"\s*,\s*"([^"]*)"/g)) {
        const [, key, fallback] = match;
        if (fallback?.includes(EM_DASH)) offending.push(`${path.relative(ROOT, file)} → ${key}`);
      }
    }

    expect(offending).toEqual([]);
  });

  /**
   * The same blind spot, one directory over: `constants/` holds pools of prose the app draws
   * from — the rest-day suggestion on Home, the empty-handed line on the victory screen, the
   * village's flavour text — and twelve of those strings carried a dash while every scan above
   * was green. They are literals in a `.ts`, so no locale file, no `t()` call and no reader-facing
   * path could see them.
   *
   * Comments are stripped first: this file's own prose, and the repo's, is out of the ban.
   */
  it("no constant string uses an em dash", () => {
    const dir = path.join(ROOT, "constants");
    const offending = fs
      .readdirSync(dir)
      .filter((file) => file.endsWith(".ts"))
      // `distanceFormat.ts` returns "—" as its null reading: a table glyph for a distance that
      // does not exist, never a hinge inside a sentence. The only name on this list.
      .filter((file) => file !== "distanceFormat.ts")
      .flatMap((file) => {
        const body = fs
          .readFileSync(path.join(dir, file), "utf8")
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .replace(/\/\/.*$/gm, "");
        return [...body.matchAll(/"(?:[^"\\\n]|\\.)*"/g)]
          .filter((match) => match[0].includes(EM_DASH))
          .map((match) => `constants/${file}: ${match[0].slice(0, 70)}`);
      });

    expect(offending).toEqual([]);
  });

  /**
   * Seed content is the third surface, and it was invisible to all of the above: an exercise or
   * quest description lives in a `drizzle/*.sql` string, reaches the hero through the database,
   * and no locale scan can see it. `0041` shipped three movement instructions with a dash and a
   * `vous` in them, on a branch whose whole point was the outing they describe.
   *
   * A ratchet, like `seed-migration-guard.test.ts`: the seven migrations below carry the same
   * debt and are named rather than fixed, because their rows are already in every installed
   * database. Editing those files changes nothing for a hero who has them; only a new migration
   * would, and that is a copy pass in two languages, not a lint fix. Never add a file to this
   * list. SQL line comments are code, and are skipped like every other comment in the repo.
   */
  const SEED_DEBT = [
    "0006_content_expansion.sql",
    "0016_seed_new_quests.sql",
    "0017_seed_adventures.sql",
    "0024_mobility_branch.sql",
    "0029_fr_tutoiement.sql",
    "0032_calisthenics_rungs.sql",
    "0033_calisthenics_summits.sql",
  ];

  it("no seeded string uses an em dash", () => {
    const dir = path.join(ROOT, "drizzle");
    const offending = fs
      .readdirSync(dir)
      .filter((file) => file.endsWith(".sql") && !SEED_DEBT.includes(file))
      .flatMap((file) => {
        const body = fs
          .readFileSync(path.join(dir, file), "utf8")
          .split("\n")
          .filter((line) => !line.trimStart().startsWith("--"))
          .join("\n");
        return [...body.matchAll(/'((?:[^']|'')*)'/g)]
          .filter((match) => match[1]?.includes(EM_DASH))
          .map(() => file);
      });

    expect(offending).toEqual([]);
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
