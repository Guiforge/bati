import appJson from "../app.json";

// The path Expo actually calls: it hands app.json in as `config` and uses whatever comes back.
// Testing the exported function instead would prove the arithmetic and still let the wiring rot.
// biome-ignore lint/suspicious/noExplicitAny: the Expo config type is not worth importing for a shape this small
const appConfig = require("../app.config.js") as (arg: { config: any }) => any;

const versionCodeFor = (version: string): number =>
  appConfig({ config: { version, android: { package: "com.guiforge.bati" } } }).android.versionCode;

describe("android versionCode", () => {
  test("is derived from the version in app.json", () => {
    // If this ever needs updating by hand, the derivation has stopped being a derivation.
    expect(versionCodeFor(appJson.expo.version)).toBe(
      appConfig({ config: appJson.expo }).android.versionCode,
    );
  });

  test("rises with every kind of bump", () => {
    // A versionCode that fails to rise is an update Android refuses to install, which is the whole
    // reason this file exists — so the property under test is ordering, not the exact integers.
    const ordered = ["0.9.9", "1.0.0", "1.0.1", "1.0.2", "1.0.99", "1.1.0", "1.99.99", "2.0.0"];
    const codes = ordered.map(versionCodeFor);

    for (let i = 1; i < codes.length; i++) {
      expect(codes[i]).toBeGreaterThan(codes[i - 1]);
    }
  });

  test("keeps the rest of the config untouched", () => {
    expect(appConfig({ config: appJson.expo }).android.package).toBe("com.guiforge.bati");
  });

  test("refuses a version it cannot encode rather than wrapping", () => {
    // 1.0.100 would collide with 1.1.0 if it silently carried; a duplicate versionCode is a
    // release that looks published and can never be updated over.
    expect(() => versionCodeFor("1.0.100")).toThrow(/overflows/);
    expect(() => versionCodeFor("1.100.0")).toThrow(/overflows/);
    expect(() => versionCodeFor("1.0")).toThrow(/major.minor.patch/);
  });
});
