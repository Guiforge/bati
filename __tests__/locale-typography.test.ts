import * as fs from "node:fs";
import * as path from "node:path";

// Three typographic rules the locale files drifted on, kept from drifting again.
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

const LOCALES = path.resolve(__dirname, "..", "locales");

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
});
