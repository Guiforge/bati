// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
const { withTamagui } = require("@tamagui/metro-plugin");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

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
