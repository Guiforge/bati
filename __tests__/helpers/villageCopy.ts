import * as fs from "node:fs";
import * as path from "node:path";

export const LANGS = ["fr", "en", "de", "es"] as const;
export type Lang = (typeof LANGS)[number];

const LOCALES = path.resolve(__dirname, "..", "..", "locales");

/**
 * Strings, comments and template literals of a source file, in one pass, so a comment is skipped
 * and a `//` inside a URL string is not mistaken for one. Filter out the tokens starting with "/".
 */
export const TOKEN =
  /\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\[\s\S])*`/g;

const ROOT = path.resolve(__dirname, "..", "..");

/**
 * Every source file of the feature that holds or renders a sentence, read by the forbidden-words
 * and the no-chores scans alike. One list: a file added to one scan is added to both.
 */
export const COPY_FILES = [
  "components/village/crestText.ts",
  "components/village/crestLine.ts",
  "components/village/milestoneLine.ts",
  "components/village/barScale.ts",
  "components/village/rows.ts",
  "components/village/Crest.tsx",
  "components/village/CrestSheet.tsx",
  "components/village/LevelPips.tsx",
  "components/village/VillageDetailSheet.tsx",
  "components/village/VillageEmbers.tsx",
  "components/village/VillageLists.tsx",
  "components/village/VillageReward.tsx",
  "components/village/VillageScene.tsx",
  "components/village/VillageSceneViewer.tsx",
  "components/session/bigFeastText.ts",
  "components/session/recordText.ts",
  "components/session/feasts.ts",
  "components/session/TonightList.tsx",
  "components/session/BigFeastView.tsx",
  "components/session/NextMilestone.tsx",
  "app/big-feast.tsx",
  "components/settings/CrestAnimalRow.tsx",
  "db/village.ts",
  "db/crestRules.ts",
  "db/milestone.ts",
  "db/userLevel.ts",
  "db/achievements.ts",
  "db/muscles.ts",
];

/**
 * The victory and home screens render next to the village; they hold no copy of the feature, so
 * only the locale keys they read (all of them, not just the XP lines and the level) are taken
 * into scope (see derivedKeys), not their own literals.
 */
const KEY_ONLY_FILES = ["components/session/VictoryView.tsx", "components/home/HomeHeader.tsx"];

/** String, comment-free literals of the shared files, as {file, text} (quotes removed). */
export function sourceLiterals(files: readonly string[] = COPY_FILES) {
  return files.flatMap((f) =>
    [...fs.readFileSync(path.join(ROOT, f), "utf8").matchAll(TOKEN)]
      .map((m) => m[0])
      .filter((tok) => !tok.startsWith("/"))
      .map((tok) => ({ file: f, text: tok.slice(1, -1) })),
  );
}

/** A literal that reads as a sentence: it has a space or a capital, unlike a key, a code or a style token. */
export const isReadable = (text: string) => /\s|^[A-Z]/.test(text);

/**
 * Keys the feature's files actually read: every literal that is a dotted locale key (so a new
 * `t("session.x")` is in scope without a hand-kept list), and every `prefix_${...}` family as its
 * prefix. Derived from the code that renders them, because a key listed by hand is forgotten.
 */
const PLURALS = ["one", "other", "zero", "few", "many"];
let derived: { keys: Set<string>; prefixes: string[] } | undefined;
function derivedKeys() {
  if (derived) return derived;
  const real = new Set<string>();
  const collect = (node: unknown, trail: string) => {
    if (typeof node === "string") real.add(trail);
    else if (node && typeof node === "object")
      for (const [k, v] of Object.entries(node)) collect(v, trail ? `${trail}.${k}` : k);
  };
  collect(JSON.parse(fs.readFileSync(path.join(LOCALES, "en.json"), "utf8")), "");
  const keys = new Set<string>();
  const prefixes: string[] = [];
  for (const { text } of sourceLiterals([...COPY_FILES, ...KEY_ONLY_FILES])) {
    // plural suffixes are not in the code: t("x", { count }) reads x_one and x_other
    if (/^[a-z_]+(\.[a-z_0-9]+)+$/.test(text))
      for (const k of [text, ...PLURALS.map((p) => `${text}_${p}`)]) if (real.has(k)) keys.add(k);
    for (const m of text.matchAll(/([a-z_]+(?:\.[a-z_0-9]+)*[._])\$\{/g)) prefixes.push(m[1] ?? "");
  }
  derived = { keys, prefixes };
  return derived;
}

/**
 * Keys of other features that "Ce soir" and the victory screens show next to the village's own
 * copy, so they answer to the same rules. An explicit list: a new key there is added by hand.
 */
const ADJACENT_KEYS =
  /^(session\.(level_label|next_title|pr_\w+|standing_\w+)|boss\.(victory_title|final_blow|triumph_subtitle)|oath\.(fulfilled|metric)_\w+|progression\.(new_rung_from|rung_also_leads_to)|journal\.pr_longest_outing)$/;

/** Whether a dotted locale key belongs to "Un village qui te ressemble": the Village, the crest, the feasts, "Ce soir". */
export function isFeatureKey(key: string): boolean {
  const { keys, prefixes } = derivedKeys();
  return (
    ADJACENT_KEYS.test(key) ||
    keys.has(key) ||
    prefixes.some((p) => key.startsWith(p)) ||
    key.startsWith("village.") ||
    /^session\.(tonight|feast|village)_/.test(key) ||
    /^settings\.(crest|village)_/.test(key) ||
    key === "tabs.village" ||
    key === "home.village_a11y"
  );
}

/** Every string of one locale file under the feature's keys, as [dotted key, value]. */
export function featureCopy(lang: Lang): [string, string][] {
  const out: [string, string][] = [];
  const walk = (node: unknown, trail: string) => {
    if (typeof node === "string") {
      if (isFeatureKey(trail)) out.push([trail, node]);
    } else if (node && typeof node === "object") {
      for (const [k, v] of Object.entries(node)) walk(v, trail ? `${trail}.${k}` : k);
    }
  };
  walk(JSON.parse(fs.readFileSync(path.join(LOCALES, `${lang}.json`), "utf8")), "");
  return out;
}
