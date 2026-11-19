// Jest drops its file cache on every `jest.resetModules()`, so each reset re-read and utf8-decoded
// every image the module graph pulls in (~20 MB per reset through constants/assetMap): half the
// time of the db suites. The mapper in package.json points `@/assets/` requires at these stubs,
// which hold what @react-native/jest-preset's assetFileTransformer would, one module per file, in
// JSON so no transform runs. Bare `../assets/` is left alone: expo-router requires its own.
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const out = path.join(root, "node_modules/.cache/jest-asset-stubs");
// The transformer's base, so `testUri` (and any snapshot holding it) is unchanged.
const base = path.resolve(require.resolve("react-native/package.json"), "../jest/");

module.exports = () => {
  for (const rel of fs.readdirSync(path.join(root, "assets"), { recursive: true })) {
    if (!/\.(webp|png|jpe?g|wav)$/.test(rel)) continue;
    const testUri = path.relative(base, path.join(root, "assets", rel)).replace(/\\/g, "/");
    const stub = path.join(out, `${rel}.json`);
    fs.mkdirSync(path.dirname(stub), { recursive: true });
    fs.writeFileSync(stub, JSON.stringify({ testUri }));
  }
};
