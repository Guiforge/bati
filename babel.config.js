module.exports = (api) => {
  api.cache(true);

  return {
    presets: ["babel-preset-expo"],
    plugins: [
      ["inline-import", { extensions: [".sql"] }],
      // @tamagui/babel-plugin removed: @tamagui/static can't require react-native 0.86
      // (ESM/Flow source) in Node, so extraction failed on every file ("skipping").
      // Tamagui still works fully at runtime. Re-add the plugin once on tamagui v2+.
      // IMPORTANT: must be last
      "react-native-reanimated/plugin",
    ],
  };
};
