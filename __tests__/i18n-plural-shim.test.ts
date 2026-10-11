// Hermes has no Intl.PluralRules, so the app installs its own. Jest has one, so the test removes it
// first and boots i18n the way the app does.
const real = Intl.PluralRules;

async function boot() {
  // biome-ignore lint/suspicious/noExplicitAny: removing a built-in the way Hermes lacks it
  delete (Intl as any).PluralRules;
  let i18n: typeof import("@/i18n").i18n | undefined;
  jest.isolateModules(() => {
    i18n = require("@/i18n").i18n;
  });
  if (!i18n) throw new Error("i18n did not load");
  await i18n.changeLanguage("en");
  return i18n;
}

afterEach(() => {
  Object.defineProperty(Intl, "PluralRules", { value: real, configurable: true, writable: true });
});

const KEY = "exercises.count";

it("French: 0 and 1 are singular, 2 plural, a round million is _many", async () => {
  const i18n = await boot();
  await i18n.changeLanguage("fr");
  expect(i18n.t(KEY, { count: 0 })).toBe("0 exercice");
  expect(i18n.t(KEY, { count: 1 })).toBe("1 exercice");
  expect(i18n.t(KEY, { count: 2 })).toBe("2 exercices");
  expect(i18n.t(KEY, { count: 1_000_000 })).toBe("1000000 exercices");
});

// Through i18next, on the engine Hermes is: the rule has to reach the `_few` and `_many` keys.
it("Russian: 1 and 21 are one, 2 to 4 few, the rest and the teens many", async () => {
  const i18n = await boot();
  await i18n.changeLanguage("ru");
  expect(i18n.t(KEY, { count: 1 })).toBe("1 упражнение");
  expect(i18n.t(KEY, { count: 21 })).toBe("21 упражнение");
  expect(i18n.t(KEY, { count: 3 })).toBe("3 упражнения");
  expect(i18n.t(KEY, { count: 0 })).toBe("0 упражнений");
  expect(i18n.t(KEY, { count: 12 })).toBe("12 упражнений");
});

it("English: 0 is plural, 1 singular", async () => {
  const i18n = await boot();
  expect(i18n.t(KEY, { count: 0 })).toMatch(/exercises$/);
  expect(i18n.t(KEY, { count: 1 })).toMatch(/exercise$/);
});

it("leaves a real Intl.PluralRules alone", () => {
  jest.isolateModules(() => {
    require("@/i18n");
  });
  expect(Intl.PluralRules).toBe(real);
});

/**
 * The rules written out for Hermes, held against the real thing. Node carries the full CLDR, so a
 * language added with the wrong rule, or with the fallback because nobody wrote one, fails here
 * instead of printing "5 день" on a phone. This is the gate a language with `few` goes through.
 */
describe("the written rules agree with Intl.PluralRules", () => {
  const { APP_LANGUAGES } =
    require("@/src/i18n/deviceLanguage") as typeof import("@/src/i18n/deviceLanguage");
  const { pluralCategory, pluralCategories } =
    require("@/src/i18n/pluralRules") as typeof import("@/src/i18n/pluralRules");

  const counts = [...Array.from({ length: 1200 }, (_, n) => n), 1e6, 1e6 + 1, 2e6, 5e6];

  it.each(APP_LANGUAGES)("%s", (language) => {
    const intl = new Intl.PluralRules(language);
    const wrong = counts.filter((n) => pluralCategory(language, n) !== intl.select(n));
    expect(wrong).toEqual([]);
    expect(pluralCategories(language).sort()).toEqual(
      [...intl.resolvedOptions().pluralCategories].sort(),
    );
  });
});
