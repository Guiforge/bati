import config from "@/tamagui.config";

/**
 * A stock primitive asks the theme for `borderColor`, and the themes only spread the app's own
 * colour tokens, which have none: Tamagui logged "missing token borderColor in category color"
 * a dozen times at every launch. Both themes the app can start in define it, from the border
 * token it already has (`constants/rawColors.ts`, no new colour). The Journal's sub-theme would
 * inherit dark's, a visible line on a page whose surfaces carry none: it follows its own
 * `borderStrong` too.
 */
test.each(["light", "dark", "dark_journal"] as const)(
  "the %s theme defines borderColor as the border token",
  (name) => {
    const theme = config.themes[name] as Record<string, { val?: string } | string>;
    const read = (key: string) => {
      const v = theme[key];
      return typeof v === "string" ? v : v?.val;
    };
    expect(read("borderColor")).toBeDefined();
    expect(read("borderColor")).toBe(read("borderStrong"));
  },
);
