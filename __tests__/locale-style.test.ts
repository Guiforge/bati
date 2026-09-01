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
// 3. Em dashes come in pairs, in French only. French typography uses the tiret
//    cadratin for dialogue and, in pairs, to isolate an incise — backup.confirmMessage
//    does exactly that and is why this rule counts rather than bans. A lone dash mid
//    sentence is the English hinge ("X — not Y"), and 30 of them had been translated
//    across before this test existed. en.json is deliberately exempt: there the
//    construction is correct and part of the voice.
//
// 4. One form of address per surface. The app says `tu`; the privacy policy and the
//    safety notices say `vous`, because one is a game speaking to a hero and the
//    other is a document addressing a user. Thirteen strings had drifted across the
//    line, and the GPS work added two more before this was written down. The rule is
//    the allowlist below, and widening it is a decision about which surface a screen
//    belongs to, never a way to land a string.
//
// Rule 3 does not stop at the app. The published site and the privacy policy carry
// French too, and both were written with the same lone hinge — seven of them in the
// policy alone. They are markdown and HTML rather than JSON, so they get their own
// check below rather than a second parser: a paragraph of French prose must hold an
// even number of dashes. A heading is exempt, because "Politique de
// confidentialité — Bati" is a separator, not an incise.

const ROOT = path.resolve(__dirname, "..");
const LOCALES = path.join(ROOT, "locales");

/** The French half of the bilingual policy, and the French spans of the bilingual site. */
const FRENCH_PROSE: Record<string, (source: string) => string> = {
  "docs/legal/privacy.md": (source) => source.slice(source.indexOf('<div lang="fr"')),
  "docs/legal/index.html": (source) =>
    (source.match(/lang="fr"[^>]*>[\s\S]*?<\/span/g) ?? []).join("\n\n"),
};

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

  it("fr.json only uses em dashes in pairs", () => {
    const lonely = offenders("fr.json", (v) => {
      const count = v.split(EM_DASH).length - 1;
      return count % 2 !== 0;
    });
    expect(lonely).toEqual([]);
  });

  /**
   * The two sections that address a *user* rather than a hero. Both are documents the app
   * happens to render: a privacy policy and a set of safety notices, which is why they are
   * allowed the register a policy is written in. Everything else is the game talking.
   */
  const VOUVOIEMENT_ALLOWED = ["privacy.", "safety."];

  it("fr.json says tu everywhere the app speaks for itself", () => {
    const formal = entriesOf("fr.json")
      .filter((e) => !VOUVOIEMENT_ALLOWED.some((prefix) => e.key.startsWith(prefix)))
      .filter((e) => /\b(vous|votre|vos)\b/i.test(e.value))
      .map((e) => `fr.json → ${e.key}: ${e.value.slice(0, 70)}`);

    expect(formal).toEqual([]);
    // and the allowed sections really do use it, so emptying them cannot silently
    // turn this into a rule that checks nothing
    expect(entriesOf("fr.json").filter((e) => /\bvous\b/i.test(e.value)).length).toBeGreaterThan(0);
  });

  it.each(Object.keys(FRENCH_PROSE))("%s only uses em dashes in pairs", (file) => {
    const french = FRENCH_PROSE[file]?.(fs.readFileSync(path.join(ROOT, file), "utf8")) ?? "";

    const lonely = french
      .split(/\n\s*\n/)
      .filter((paragraph) => !paragraph.trimStart().startsWith("#"))
      .filter((paragraph) => (paragraph.split(EM_DASH).length - 1) % 2 !== 0)
      .map((paragraph) => `${file}: ${paragraph.replace(/\s+/g, " ").trim().slice(0, 90)}`);

    expect(lonely).toEqual([]);
  });
});
