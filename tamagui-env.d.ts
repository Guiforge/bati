import type appConfig from "./tamagui.config";

type CustomConfig = typeof appConfig;

declare module "tamagui" {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface TamaguiCustomConfig extends CustomConfig {}
}
