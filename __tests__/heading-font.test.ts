import * as fs from "node:fs";
import * as path from "node:path";
import config from "@/tamagui.config";

describe("the title font", () => {
  const heading = config.fonts.heading;

  it("is Alegreya, untracked", () => {
    expect(heading.family).toBe("Alegreya");
    for (const v of Object.values(heading.letterSpacing ?? {})) expect(v).toBe(0);
  });

  it("maps every weight it declares to a face the root layout loads", () => {
    const layout = fs.readFileSync(path.resolve(__dirname, "../app/_layout.tsx"), "utf8");
    for (const face of Object.values(heading.face ?? {})) {
      expect(layout).toContain((face as { normal: string }).normal);
    }
  });

  /**
   * Alegreya's default figures are old-style: in a timer, 0:23 bobs up and down. Digits are set
   * in the body font. The warm-up timer was the one heading-font number in the app.
   */
  it("never sets the warm-up timer", () => {
    const warmup = fs.readFileSync(
      path.resolve(__dirname, "../components/session/WarmupView.tsx"),
      "utf8",
    );
    const at = warmup.indexOf("formatTime(Math.max(0, remainingSeconds))");
    expect(at).toBeGreaterThan(0);
    const timer = warmup.slice(at - 400, at);
    expect(timer).toContain('fontFamily="$body"');
  });
});
