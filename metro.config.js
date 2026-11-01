const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add .sql extension for Drizzle migrations
config.resolver.sourceExts.push("sql");

// Add .mjs extension for ESM module resolution (fixes Tamagui parsing issues)
// https://github.com/expo/expo/issues/23180
config.resolver.sourceExts.push("mjs");

// expo-sqlite's web backend (wa-sqlite) imports its WASM binary directly; Metro doesn't
// treat .wasm as an asset by default, so web bundling fails to resolve it without this.
config.resolver.assetExts.push("wasm");

// The village ambience (assets/sounds/village/) ships as Ogg Vorbis, which Expo's defaults
// leave out of assetExts (mp3 and wav only): jest never sees it, the release bundle fails.
config.resolver.assetExts.push("ogg");

module.exports = config;
