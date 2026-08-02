// Everything is still declared in app.json. This file exists for one value that JSON cannot
// express: an Android versionCode derived from the version string rather than typed a second time.
//
// It has to be derived. `versionCode` was simply absent until now, so Expo defaulted it to `1` and
// every build ever cut carried the same one — which means Android refused to install v1.0.1 over
// v1.0.0 as an update (an update must raise the integer), and `fdroid update` never saw a new
// version to offer. A `1.0.1` in app.json that a human also has to mirror as `10001` somewhere else
// is the same bug waiting to happen again; one source, computed, cannot drift.

/**
 * `1.0.1` -> `10001`. Monotonic with semver as long as minor and patch stay below 100.
 *
 * ponytail: two digits each for minor and patch. That ceiling is a `1.100.0` or a `1.0.100`, and
 * it throws rather than silently wrapping into the neighbouring field — a versionCode that goes
 * *down* is unrecoverable in the field, because Android will not install over it. If the project
 * ever needs a third digit, widen the multipliers and never renumber what has already shipped.
 */
function versionCodeFrom(version) {
  const parts = String(version ?? "").split(".");
  if (parts.length !== 3) {
    throw new Error(`app.config.js: expected a "major.minor.patch" version, got "${version}"`);
  }

  const [major, minor, patch] = parts.map(Number);
  if (![major, minor, patch].every((n) => Number.isInteger(n) && n >= 0)) {
    throw new Error(`app.config.js: version "${version}" has a non-integer component`);
  }
  if (minor > 99 || patch > 99) {
    throw new Error(
      `app.config.js: version "${version}" overflows the versionCode scheme (minor and patch must stay below 100)`,
    );
  }

  return major * 10000 + minor * 100 + patch;
}

// Expo calls this with app.json already loaded as `config`. Tooling does not always: `knip`
// evaluates the file bare to discover dependencies, and would otherwise trip the guard above on an
// undefined version. Merging app.json in makes the function total without inventing a value — in
// Expo's path the two are the same object, so the spread is a no-op.
const appJson = require("./app.json");

module.exports = ({ config } = {}) => {
  const base = { ...appJson.expo, ...config };
  return {
    ...base,
    android: { ...base.android, versionCode: versionCodeFrom(base.version) },
  };
};
