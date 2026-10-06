// Build the BD core components as a web package (`bati-ds`) for the design-sync converter.
//
//   node .design-sync/web/build.mjs        (from the repo root; esbuild from .ds-sync/node_modules)
//
// Bati is React Native + Tamagui; claude.ai/design renders React DOM. This aliases react-native to
// react-native-web, stubs the two device-only modules the stores pull in (SQLite, the Android
// widget), inlines images and fonts, and writes .design-sync/.cache/pkg/{package.json,dist/}.
// The converter then takes `--entry .design-sync/.cache/pkg/dist/index.cjs`.
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const pkg = join(root, ".design-sync/.cache/pkg");
const require = createRequire(join(root, ".ds-sync/package.json"));
const esbuild = require("esbuild");

rmSync(pkg, { recursive: true, force: true });
mkdirSync(join(pkg, "dist"), { recursive: true });
writeFileSync(
  join(pkg, "package.json"),
  JSON.stringify(
    { name: "bati-ds", version: "0.0.0", main: "dist/index.cjs", types: "dist/types/.design-sync/web/entry.d.ts" },
    null,
    2,
  ),
);

const stubs = {
  "@/db": join(here, "stubs/db.ts"),
  "@/src/widget": join(here, "stubs/widget.ts"),
};

await esbuild.build({
  entryPoints: [join(here, "entry.tsx")],
  outfile: join(pkg, "dist/index.cjs"),
  bundle: true,
  format: "cjs",
  platform: "browser",
  jsx: "automatic",
  target: "es2020",
  tsconfig: join(root, "tsconfig.json"),
  external: ["react", "react-dom", "react/jsx-runtime", "react-dom/client"],
  alias: { "react-native": "react-native-web" },
  resolveExtensions: [".web.tsx", ".web.ts", ".web.js", ".tsx", ".ts", ".jsx", ".js", ".json"],
  mainFields: ["browser", "module", "main"],
  conditions: ["browser", "import", "default"],
  loader: { ".png": "dataurl", ".jpg": "dataurl", ".webp": "dataurl", ".svg": "dataurl", ".ttf": "dataurl", ".js": "jsx" },
  define: {
    __DEV__: "false",
    "process.env.NODE_ENV": '"production"',
    "process.env.EXPO_OS": '"web"',
    "process.env.TAMAGUI_TARGET": '"web"',
    global: "globalThis",
  },
  plugins: [
    {
      name: "device-stubs",
      setup(b) {
        b.onResolve({ filter: /^@\/(db|src\/widget)$/ }, (a) => ({ path: stubs[a.path] }));
      },
    },
  ],
  // Expo and Tamagui read more process.env keys than the defines above name; a browser has none.
  banner: { js: 'var process = globalThis.process || { env: { NODE_ENV: "production" } };' },
  logLevel: "warning",
});

execFileSync(
  "npx",
  ["tsc", "-p", join(here, "tsconfig.json")],
  { cwd: root, stdio: "inherit" },
);
console.log(`bati-ds built at ${pkg}`);
