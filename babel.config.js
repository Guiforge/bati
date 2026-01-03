module.exports = (api) => {
  api.cache(true);

  const isDev = process.env.NODE_ENV === "development";

  return {
    presets: ["babel-preset-expo"],
    plugins: [
      ["inline-import", { extensions: [".sql"] }],
      // Tamagui babel plugin for optimizing compiler
      // Note: Disabled in development due to Node.js 20+ ESM/CJS interop issues
      // The app works fine without it, just loses some optimization
      !isDev && [
        "@tamagui/babel-plugin",
        {
          components: ["tamagui"],
          config: "./tamagui.config.ts",
          logTimings: true,
          disableExtraction: false, // Enable extraction in production
          exclude: [/drizzle\//, /db\//],
        },
      ],
      // IMPORTANT: must be last
      "react-native-reanimated/plugin",
    ].filter(Boolean),
  };
};
