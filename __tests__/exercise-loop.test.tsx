import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { act, render, screen } from "@testing-library/react-native";

import { ExerciseLoop } from "@/components/exercises/ExerciseLoop";
import { EXERCISE_ASSETS, getExerciseLoop } from "@/constants/assetMap";
import { EXERCISE_LOOPS } from "@/constants/exerciseFrames";

let mockFocused = true;
let mockReduced = false;
jest.mock("expo-router", () => ({ useIsFocused: () => mockFocused }));
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => mockReduced }));

const ANIM_DIR = join(__dirname, "..", "assets", "images", "exercises", "anim");

describe("exercise loops", () => {
  test("every loop sits on an exercise that has a still, and ships exactly its frames", () => {
    for (const [slug, loop] of Object.entries(EXERCISE_LOOPS)) {
      expect(EXERCISE_ASSETS).toHaveProperty(slug);
      const files = readdirSync(join(ANIM_DIR, slug)).filter((f) => f.endsWith(".webp"));
      expect(files).toHaveLength(loop.frames.length);
      for (const [i, ms] of loop.steps) {
        expect(loop.frames[i]).toBeDefined();
        expect(ms).toBeGreaterThan(0);
      }
      // Every frame is shown at least once.
      expect(new Set(loop.steps.map(([i]) => i)).size).toBe(loop.frames.length);
      expect(existsSync(join(ANIM_DIR, slug, "k1.webp"))).toBe(true);
    }
  });

  test("a path resolves like the stills do, and a hero's own photo is never a loop", () => {
    expect(getExerciseLoop("assets/images/exercises/squat.png")).toBe(EXERCISE_LOOPS.squat);
    expect(getExerciseLoop("goblin_squat")).toBeNull();
    expect(getExerciseLoop("constructor")).toBeNull();
    expect(getExerciseLoop("")).toBeNull();
  });
});

describe("ExerciseLoop", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockFocused = true;
    mockReduced = false;
  });
  afterEach(() => jest.useRealTimers());

  // The renderer and expo-image's mock leave timers of their own between renders, so a count says
  // nothing. The loop's clock is the one timeout scheduled for exactly its first step.
  const loopClockStarted = async () => {
    const spy = jest.spyOn(global, "setTimeout");
    await render(<ExerciseLoop imagePath="squat" still={1} side={100} />);
    const firstMs = EXERCISE_LOOPS.squat?.steps[0]?.[1];
    const started = spy.mock.calls.some(([, ms]) => ms === firstMs);
    spy.mockRestore();
    return started;
  };

  const frameOpacities = () =>
    screen
      .getByTestId("exercise-loop")
      .children.map(
        (c) => (c as unknown as { props: { style: { opacity: number } } }).props.style.opacity,
      );

  test("cuts through the steps with one frame opaque at a time", async () => {
    await render(<ExerciseLoop imagePath="squat" still={1} side={100} />);
    expect(frameOpacities()).toEqual([1, 0, 0, 0]);
    const first = EXERCISE_LOOPS.squat?.steps[0];
    expect(first).toBeDefined();
    await act(() => jest.advanceTimersByTime((first?.[1] ?? 0) + 1));
    expect(frameOpacities().filter((o) => o === 1)).toHaveLength(1);
    expect(frameOpacities()[0]).toBe(0);
  });

  test("reduced motion and an unfocused screen show the still, with no timer", async () => {
    mockReduced = true;
    expect(await loopClockStarted()).toBe(false);
    expect(screen.queryByTestId("exercise-loop")).toBeNull();
  });

  test("an exercise with no loop is its still", async () => {
    await render(<ExerciseLoop imagePath="goblin_squat" still={1} side={100} />);
    expect(screen.queryByTestId("exercise-loop")).toBeNull();
  });

  test("stops its clock when the screen loses focus", async () => {
    mockFocused = false;
    expect(await loopClockStarted()).toBe(false);
    expect(screen.queryByTestId("exercise-loop")).toBeNull();
  });

  test("and the check above would see the clock if it ran", async () => {
    expect(await loopClockStarted()).toBe(true);
  });
});
