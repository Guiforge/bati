import en from "@/locales/en.json";
import fr from "@/locales/fr.json";

/**
 * Keys a screen renders by building the string, which nothing else can see.
 *
 * `__tests__/i18n-keys.test.ts` compares en against fr, so a key missing from *both* passes it,
 * and i18next then renders the key itself. That is not hypothetical: `exercise_editor.style_expedition`
 * has been absent from both locales since `0041` made the chip selectable, so the exercise editor
 * has been offering a style labelled "exercise_editor.style_expedition" ever since.
 *
 * Every list below is a `const` a screen maps over. When someone adds an entry to one, this fails
 * until the words exist.
 */
const LISTS: { keys: readonly string[]; source: string }[] = [
  {
    // `RULES` in app/xp.tsx, rendered as `xp.<rule>_title` / `_body`.
    source: "app/xp.tsx",
    keys: ["unit", "rest", "movement", "outside", "decay", "ceiling", "kept"].flatMap((rule) => [
      `xp.${rule}_title`,
      `xp.${rule}_body`,
    ]),
  },
  {
    // `SECTIONS` in app/privacy.tsx.
    source: "app/privacy.tsx",
    keys: ["storage", "backups", "never", "permissions", "crashes", "children", "contact"].flatMap(
      (section) => [`privacy.${section}_title`, `privacy.${section}_body`],
    ),
  },
  {
    // `exerciseStyles` in db/schema.ts, rendered as a chip per style by app/exercises/new.tsx.
    source: "app/exercises/new.tsx",
    keys: ["strength", "calisthenics", "yoga", "cardio", "expedition"].map(
      (style) => `exercise_editor.style_${style}`,
    ),
  },
];

const lookup = (bundle: unknown, path: string): unknown =>
  path.split(".").reduce<unknown>((node, part) => {
    if (typeof node !== "object" || node === null) return undefined;
    return (node as Record<string, unknown>)[part];
  }, bundle);

describe("keys a screen builds rather than writes", () => {
  for (const { keys, source } of LISTS) {
    test(`${source} has words for every entry it maps over`, () => {
      const missing = keys.filter(
        (key) => typeof lookup(en, key) !== "string" || typeof lookup(fr, key) !== "string",
      );
      expect(missing).toEqual([]);
    });
  }
});
