// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
const { withTamagui } = require("@tamagui/metro-plugin");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// -------------------------------------------------------------------------
// 1. CONFIGURATION SVG (react-native-svg-transformer)
// -------------------------------------------------------------------------
// Permet d'importer des .svg comme des composants React
const { transformer, resolver } = config;

config.transformer = {
  ...transformer,
  babelTransformerPath: require.resolve("react-native-svg-transformer"),
};

config.resolver = {
  ...resolver,
  // Exclure .svg des assets statiques (images gérées par le bundler natif)
  assetExts: resolver.assetExts.filter((ext) => ext !== "svg"),
  // Ajouter .svg aux fichiers source (gérés par Babel)
  sourceExts: [...resolver.sourceExts, "svg"],
};

// -------------------------------------------------------------------------
// 2. EXTENSIONS SUPPLÉMENTAIRES
// -------------------------------------------------------------------------

// Support Drizzle ORM (fichiers de migration)
config.resolver.sourceExts.push("sql");

// Support ESM et correctifs Tamagui/Moti
// "mjs" est critique pour certains paquets modernes
config.resolver.sourceExts.push("mjs");

// -------------------------------------------------------------------------
// 3. TAMAGUI COMPILER WRAPPER
// -------------------------------------------------------------------------
// Ceci active l'optimisation statique des styles.
// Assurez-vous que './tamagui.config.ts' pointe bien vers votre fichier.

module.exports = withTamagui(config, {
  components: ["tamagui"],
  config: "./tamagui.config.ts",
  outputCSS: "./tamagui-web.css",
});
