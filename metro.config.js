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

// The atelier's web map (scripts/atelier/web): no database in the browser.
if (process.env.ATELIER_WEB) {
  const stubs = `${__dirname}/scripts/atelier/web`;
  config.resolver.resolveRequest = (ctx, name, platform) => {
    if (/\/db\/[^/]*$/.test(ctx.originModulePath) && name === "./client")
      return { type: "sourceFile", filePath: `${stubs}/db-client-stub.ts` };
    if (name === "@/db/client") return { type: "sourceFile", filePath: `${stubs}/db-client-stub.ts` };
    if (name === "react-native-android-widget" || name === "./src/widget")
      return { type: "sourceFile", filePath: `${stubs}/widget-stub.ts` };
    if (name === "./ColorTintFilter" && ctx.originModulePath.includes("expo-image"))
      return { type: "sourceFile", filePath: `${stubs}/expo-image-tint.js` };
    if (name === "react-native-svg" && !ctx.originModulePath.endsWith("svg-stub.tsx"))
      return { type: "sourceFile", filePath: `${stubs}/svg-stub.tsx` };
    if (name === "@tamagui/animations-react-native")
      return { type: "sourceFile", filePath: `${stubs}/tamagui-animations-stub.ts` };
    return ctx.resolveRequest(ctx, name, platform);
  };
}

module.exports = config;
