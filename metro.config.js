const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add .sql extension for Drizzle migrations
config.resolver.sourceExts.push("sql");

// Add .mjs extension for ESM module resolution (fixes Tamagui parsing issues)
// https://github.com/expo/expo/issues/23180
config.resolver.sourceExts.push("mjs");

module.exports = config;
