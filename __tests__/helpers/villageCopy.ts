import * as fs from "node:fs";
import * as path from "node:path";

export const LANGS = ["fr", "en", "de", "es"] as const;
export type Lang = (typeof LANGS)[number];

const LOCALES = path.resolve(__dirname, "..", "..", "locales");

/** Whether a dotted locale key belongs to "Un village qui te ressemble": the Village, the crest, the feasts, "Ce soir". */
export function isFeatureKey(key: string): boolean {
  return (
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
