module.exports = (api) => {
  api.cache(true);

  // Release builds only. Every console.* call carries real overhead on the JS thread, and the
  // migration path in DatabaseProvider logs a dozen lines on every cold start — debug output
  // that was never meant to reach a hero's phone. `error` is kept: it is what reportError()
  // uses, and it is the last trace a crash leaves behind.
  const stripConsole = process.env.NODE_ENV === "production";

  return {
    presets: ["babel-preset-expo"],
    plugins: [
      ...(stripConsole ? [["transform-remove-console", { exclude: ["error"] }]] : []),
      ["inline-import", { extensions: [".sql"] }],
      // @tamagui/babel-plugin removed: @tamagui/static can't require react-native 0.86
      // (ESM/Flow source) in Node, so extraction failed on every file ("skipping").
      // Tamagui still works fully at runtime. Re-add the plugin once on tamagui v2+.
      // IMPORTANT: must be last
      "react-native-reanimated/plugin",
    ],
  };
};
