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
