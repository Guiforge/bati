// tamagui.config.ts names the native driver, which refuses to load on web; the map uses none of it.
import { createAnimations as css } from "@tamagui/animations-css";

export const createAnimations = (config: Record<string, unknown>) =>
  css(Object.fromEntries(Object.keys(config).map((k) => [k, "ease-in 100ms"])));
