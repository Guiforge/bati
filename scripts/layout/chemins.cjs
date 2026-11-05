// Bundles scripts/layout/chemins.ts with esbuild (native packages stubbed, images emptied) and runs it: node scripts/layout/chemins.cjs
const esbuild = require("esbuild");
const path = require("node:path");
const os = require("node:os");
const fs = require("node:fs");

const out = path.join(os.tmpdir(), `chemins-${process.pid}.cjs`);
const stub = path.join(os.tmpdir(), `stub-${process.pid}.js`);
fs.writeFileSync(
  stub,
  "const v = () => new Proxy(function () {}, { get: (_, k) => (k === '__esModule' ? true : v()), apply: () => v(), construct: () => v() });\nmodule.exports = v();\n",
);
esbuild
  .build({
    entryPoints: [path.join(__dirname, "chemins.ts")],
    bundle: true,
    platform: "node",
    format: "cjs",
    outfile: out,
    logLevel: "error",
    loader: { ".webp": "empty", ".png": "empty", ".jpg": "empty", ".ogg": "empty", ".mp3": "empty", ".ttf": "empty" },
    plugins: [
      {
        name: "stub-native",
        setup(b) {
          b.onResolve({ filter: /^(react-native|expo|@expo|react-native-|@react-native|@shopify|@tamagui|tamagui|@legendapp)/ }, () => ({ path: stub }));
        },
      },
    ],
    define: { __DEV__: "false" },
  })
  .then(() => {
    require(out);
  })
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
