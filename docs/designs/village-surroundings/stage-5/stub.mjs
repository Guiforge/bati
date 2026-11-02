// Construit ../stage-5/dump_alentours.mjs en un seul fichier, les modules natifs (React Native, Expo) remplacés par un
// objet vide : la géométrie du village n'en a pas besoin. shortcut: un module qui lirait une vraie valeur
// native au chargement recevrait un proxy vide ; le vidage échouerait alors, il ne mentirait pas en silence.
// Copie de stage-1/stub_rn.mjs pour dump_alentours.mjs. Lancer depuis la racine du dépôt : bun docs/designs/village-surroundings/stage-5/stub.mjs <sortie.js>
const stub = {
  name: "stub-natif",
  setup(build) {
    // Deux modules ont un voisin du même nom à la casse près (monde.ts et Monde.tsx, alentours.ts et
    // Alentours.tsx) : le résolveur de bun essaie le .tsx d'abord et se perd ; on lui donne le .ts.
    build.onResolve({ filter: /^\.\/(monde|alentours)$/ }, (args) => ({
      path: `${args.importer.slice(0, args.importer.lastIndexOf("/"))}/${args.path.slice(2)}.ts`,
    }));
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

const out = globalThis.Bun.argv[2] ?? "dump_monde.js";
const r = await globalThis.Bun.build({
  entrypoints: [`${import.meta.dir}/../stage-5/dump_alentours.mjs`],
  target: "bun",
  plugins: [stub],
  tsconfig: "./tsconfig.json",
  define: { __DEV__: "false" },
});
if (!r.success) {
  console.error(r.logs);
  process.exit(1);
}
await globalThis.Bun.write(out, r.outputs[0]);
