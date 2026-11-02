// biome-ignore-all lint/correctness/noUndeclaredVariables: a script run by bun, which provides the Bun global
// Construit dump_monde.mjs en un seul fichier, les modules natifs (React Native, Expo) remplacés par un
// objet vide : la géométrie du village n'en a pas besoin. shortcut: un module qui lirait une vraie valeur
// native au chargement recevrait un proxy vide ; le vidage échouerait alors, il ne mentirait pas en silence.
// Lancer depuis la racine du dépôt : bun docs/designs/village-surroundings/stage-1/stub_rn.mjs <sortie.js>
const stub = {
  name: "stub-natif",
  setup(build) {
    build.onResolve(
      {
        filter:
          /^(react-native|react-native-[\w-]+|expo|expo-[\w-]+|@expo\/[\w-]+|@react-native[\w/-]*|@shopify\/[\w-]+|react-native-reanimated|react|tamagui|@tamagui\/[\w-]+)(\/.*)?$/,
      },
      (args) => ({ path: args.path, namespace: "stub" }),
    );
    build.onResolve({ filter: /\.(webp|png|jpg|ogg|mp3|ttf)$/ }, (args) => ({
      path: args.path,
      namespace: "stub",
    }));
    // La base SQLite s'ouvre au chargement de db/client : jamais ici.
    build.onResolve({ filter: /client$/ }, (args) =>
      args.path.includes("db/client") ||
      (args.path === "./client" && args.importer.includes("/db/"))
        ? { path: args.path, namespace: "stub" }
        : undefined,
    );
    build.onLoad({ filter: /.*/, namespace: "stub" }, () => ({
      contents:
        // getPrototypeOf : l'interop ESM de bun copie les clés propres puis hérite du prototype ; en
        // renvoyant le proxy lui-même, tout nom importé retombe sur lui.
        "const f = function () { return p; }; const p = new Proxy(f, { get: (_, k) => (k === Symbol.toPrimitive ? () => 0 : k === Symbol.iterator ? undefined : p), apply: () => p, construct: () => p, getPrototypeOf: () => p }); module.exports = p;",
      loader: "js",
    }));
  },
};

const out = Bun.argv[2] ?? "dump_monde.js";
const r = await Bun.build({
  entrypoints: [`${import.meta.dir}/dump_monde.mjs`],
  target: "bun",
  plugins: [stub],
  tsconfig: "./tsconfig.json",
  define: { __DEV__: "false" },
});
if (!r.success) {
  console.error(r.logs);
  process.exit(1);
}
await Bun.write(out, r.outputs[0]);
