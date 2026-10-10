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

/**
 * Keys of other features that "Ce soir" and the victory screens show next to the village's own
 * copy, so they answer to the same rules. An explicit list: a new key there is added by hand.
 */
const ADJACENT_KEYS =
  /^(session\.(level_label|next_title|pr_\w+|standing_\w+)|boss\.(victory_title|final_blow|triumph_subtitle)|oath\.fulfilled_\w+|progression\.(new_rung_from|rung_also_leads_to)|journal\.pr_longest_outing)$/;

/** Whether a dotted locale key belongs to "Un village qui te ressemble": the Village, the crest, the feasts, "Ce soir". */
export function isFeatureKey(key: string): boolean {
  return (
    ADJACENT_KEYS.test(key) ||
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
