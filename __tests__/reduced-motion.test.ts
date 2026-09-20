import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Anything that moves asks first.
 *
 * `SessionRewards` declared its reveal as a module constant — `transition: "bouncy"` and an
 * `enterStyle` that scaled and slid — and spread it across eight cards. A constant cannot read a
 * preference, so those cards bounced whatever Android had been told, on the screen that opens
 * straight after the effort, for someone who may be lightheaded and has explicitly asked their
 * phone to stop doing that. Every other animated component in the app honoured the setting, which
 * is exactly why nobody looked at this one.
 *
 * The rule is *remove the motion, keep the information*: a bar that fills over a second appears
 * already full, the boss's HP jumps to its value, the flame stops flickering and stays lit. Only
 * the village embers vanish outright, and they carry nothing. That part a machine cannot check.
 * What it can check is that a file which animates at all has read the preference, which is the
 * step that was skipped.
 *
 * ponytail: text scan, the trade `color-contrast.test.ts` and `android-permissions.test.ts` both
 * make. It cannot see an animation driven by a value handed down as a prop, and it does not try.
 */

/** Reanimated's drivers, and Tamagui's declarative pair. */
const ANIMATES = [
  "withTiming",
  "withRepeat",
  "withSpring",
  "withSequence",
  "withDecay",
  "enterStyle",
  "exitStyle",
  "animationType",
];

/** Either door to the preference: the raw flag, or the helper that returns `{}` when it is set. */
const ASKS = ["reducedMotion", "useAnimationProps"];

/**
 * Comments do not animate, and one file turns on it: `TimerBar` explains at length why its fill
 * is a plain width with no easing, naming `withTiming` among the things it measured and rejected.
 * An exemption list would have to carry it forever and would hide the next real one behind it.
 */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

function sourceFiles(): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.tsx?$/.test(entry.name)) found.push(full);
    }
  };
  for (const root of ["app", "components", "src", "hooks"]) {
    walk(path.resolve(__dirname, "..", root));
  }
  return found;
}

describe("reduced motion", () => {
  it("is read by every file that animates", () => {
    const deaf: string[] = [];

    for (const file of sourceFiles()) {
      const code = withoutComments(fs.readFileSync(file, "utf8"));
      if (!ANIMATES.some((token) => code.includes(token))) continue;
      if (ASKS.some((token) => code.includes(token))) continue;
      deaf.push(path.relative(process.cwd(), file));
    }

    expect(deaf).toEqual([]);
  });

  /**
   * The helper the rule is built on, in one assertion, because everything above trusts it:
   * asked for, it hands back nothing at all, and the caller's `transition` and `enterStyle`
   * disappear rather than becoming instant versions of themselves.
   */
  it("switches an animation off by removing it, not by shortening it", () => {
    jest.isolateModules(() => {
      jest.doMock("@/stores/settings", () => ({
        useSettingsStore: (select: (s: { reducedMotion: boolean }) => unknown) =>
          select({ reducedMotion: true }),
      }));
      const { useAnimationProps } =
        require("@/hooks/useReducedMotion") as typeof import("@/hooks/useReducedMotion");

      expect(useAnimationProps("bouncy", { opacity: 0, scale: 0.92 })).toEqual({});
    });
  });
});
