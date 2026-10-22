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
      // No Tamagui plugin: Tamagui runs at runtime only. v3 has no Babel plugin; its optimizing
      // compiler is `@tamagui/cli/metro`, deliberately not adopted yet: it changes the render
      // path, so it gets its own change with its own before/after measurement.
      // IMPORTANT: must be last
      "react-native-reanimated/plugin",
    ],
  };
};
