module.exports = (api) => {
  api.cache(true);

  const isDev = process.env.NODE_ENV === "development";

  return {
    presets: ["babel-preset-expo"],
    plugins: [
      ["inline-import", { extensions: [".sql"] }],

      [
        "transform-inline-environment-variables",
        {
          include: ["TAMAGUI_TARGET", "process.env.TAMAGUI_TARGET"],
        },
      ],

      !isDev && [
        "@tamagui/babel-plugin",
        {
          components: ["tamagui"],
          config: "./tamagui.config.ts",
          logTimings: true,
          disableExtraction: false,
          exclude: [/drizzle\//, /db\//, /assets\//, /node_modules\//],
        },
      ],

      "react-native-reanimated/plugin",
    ].filter(Boolean),
  };
};
