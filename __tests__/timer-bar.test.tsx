import * as fs from "node:fs";
import * as path from "node:path";
import { render } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";

import { TimerBar } from "@/components/session/TimerBar";
import config from "@/tamagui.config";

/**
 * Tamagui's `Progress` held the JS thread at 33-42 % of a core for every second a rest, a timed
 * set or a warm-up movement was on screen, spring or no spring (perf audit B2, measured on the
 * phone; the numbers are on `TimerBar`). Nothing in jest can see that: a Tamagui node renders the
 * same `View` with or without a transition. So the ratchet is a text scan, like
 * `keyboard-taps-guard.test.ts`: the component that cost it may not come back, and the bar that
 * replaced it may not grow an animation.
 */

const ROOT = path.resolve(__dirname, "..");

function sources(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sources(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

const withoutComments = (code: string) => code.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");

describe("timer bar", () => {
  it("no screen imports Tamagui's Progress", () => {
    const offenders = ["app", "components"]
      .flatMap((dir) => sources(path.join(ROOT, dir)))
      .filter((file) =>
        /import\s*\{[^}]*\bProgress\b[^}]*\}\s*from\s*"tamagui"/.test(
          fs.readFileSync(file, "utf8"),
        ),
      )
      .map((file) => path.relative(ROOT, file));
    expect(offenders).toEqual([]);
  });

  it("steps without animating", () => {
    const code = withoutComments(
      fs.readFileSync(path.join(ROOT, "components/session/TimerBar.tsx"), "utf8"),
    );
    expect(code).not.toMatch(/transition|enterStyle|animation|Animated|reanimated|withTiming/);
  });

  it.each([
    "components/session/RestView.tsx",
    "components/session/ActiveExerciseView.tsx",
    "components/session/WarmupView.tsx",
  ])("%s draws its clock with it", (file) => {
    expect(fs.readFileSync(path.join(ROOT, file), "utf8")).toMatch(/<TimerBar\b/);
  });

  it("fills to the value, clamped to the track", async () => {
    const screen = await render(
      <TamaguiProvider config={config} defaultTheme="dark">
        <TimerBar value={0.25} fill="$primary" />
      </TamaguiProvider>,
    );
    const width = () => screen.getByTestId("timer-bar-fill").props.style.width;
    expect(width()).toBe("25%");

    await screen.rerender(
      <TamaguiProvider config={config} defaultTheme="dark">
        <TimerBar value={1.6} fill="$success" />
      </TamaguiProvider>,
    );
    // Overtime: progress runs to 2, the bar stops at full.
    expect(width()).toBe("100%");
  });
});
