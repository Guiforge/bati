const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add .sql extension for Drizzle migrations
config.resolver.sourceExts.push("sql");

module.exports = config;
