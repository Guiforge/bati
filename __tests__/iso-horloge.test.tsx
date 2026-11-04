import { act, renderHook } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";
import { cancelAnimation, withTiming } from "react-native-reanimated";
import {
  angleAiles,
  CYCLE_MS,
  cibleVague,
  cibleVie,
  useHorloge,
  VAGUE_MIN_MS,
  VIE_MS,
} from "@/components/village/iso/horloge";

// A shared value here is a plain box that records its writes; withTiming returns its arguments.
jest.mock("react-native-reanimated", () => ({
  Easing: { linear: (t: number) => t },
  cancelAnimation: jest.fn(),
  useAnimatedReaction: jest.fn(),
  useSharedValue: (v: number) => {
    const { useState } = require("react");
    return useState(() => ({
      value: v,
      get() {
        return this.value;
      },
      set: jest.fn(function (this: { value: unknown }, n: unknown) {
        // An animation object starts a timing; the value stays a number, as on the UI thread.
        if (typeof n !== "object") this.value = n;
      }),
    }))[0];
  },
  withTiming: jest.fn((to: number, cfg: { duration: number }) => ({ to, ...cfg })),
}));

let mockFocus = true;
let mockReduit = false;
let mockLecteur = false;
jest.mock("expo-router", () => ({ useIsFocused: () => mockFocus }));
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => mockReduit }));

beforeEach(() => {
  mockFocus = true;
  mockReduit = false;
  mockLecteur = false;
  jest.clearAllMocks();
  jest
    .spyOn(AccessibilityInfo, "isScreenReaderEnabled")
    .mockImplementation(async () => mockLecteur);
});

describe("ambient clock maths", () => {
  it("ends a wave on a rest pose, 15 to 20 s after any start", () => {
    for (const c of [0, 1, 2499, 5000, 7777, 12345]) {
      const cible = cibleVague(c);
      expect(cible % CYCLE_MS).toBe(0);
      expect(cible - c).toBeGreaterThanOrEqual(VAGUE_MIN_MS);
      expect(cible - c).toBeLessThanOrEqual(VAGUE_MIN_MS + CYCLE_MS);
      expect(angleAiles(cible)).toBe(0);
    }
  });

  it("turns the sails by gusts: still, half a turn (four blades), still, never backwards", () => {
    expect(angleAiles(0)).toBe(0);
    expect(angleAiles(CYCLE_MS * 0.1)).toBe(0);
    expect(angleAiles(CYCLE_MS - 1)).toBeCloseTo(Math.PI, 2);
    let avant = 0;
    for (let t = 0; t < CYCLE_MS; t += 50) {
      const a = angleAiles(t);
      expect(a).toBeGreaterThanOrEqual(avant);
      avant = a;
    }
  });
});

describe("the stop rule (continu)", () => {
  it("runs 60 s from the focus and from each touch, then ends on a rest pose", async () => {
    const { result } = await renderHook(() => useHorloge());
    expect(withTiming).toHaveBeenLastCalledWith(
      cibleVie(0),
      expect.objectContaining({ duration: cibleVie(0) }),
    );
    expect(cibleVie(0)).toBe(VIE_MS);
    result.current.c.value = 23000;
    await act(() => result.current.touche());
    const cible = cibleVie(23000);
    expect(cible % CYCLE_MS).toBe(0);
    expect(cible - 23000).toBeGreaterThanOrEqual(VIE_MS);
    expect(withTiming).toHaveBeenLastCalledWith(
      cible,
      expect.objectContaining({ duration: cible - 23000 }),
    );
  });

  it("does not run under a screen reader, and stops when one comes on", async () => {
    mockLecteur = true;
    const { result } = await renderHook(() => useHorloge());
    await act(async () => {});
    await act(() => result.current.touche());
    expect(result.current.c.value % CYCLE_MS).toBe(0);
    // H1-10: the reader state starts unknown, so no wave leaves on the first render either.
    expect(withTiming).not.toHaveBeenCalled();
  });

  it("starts nothing when out of focus, with reduced motion (fige reads as it)", async () => {
    mockFocus = false;
    mockReduit = true;
    const { result } = await renderHook(() => useHorloge());
    await act(() => result.current.touche());
    expect(withTiming).not.toHaveBeenCalled();
  });
});

describe("useHorloge", () => {
  it("starts one bounded wave at focus, with no loop", async () => {
    const { result } = await renderHook(() => useHorloge());
    expect(withTiming).toHaveBeenCalledTimes(1);
    expect(withTiming).toHaveBeenCalledWith(
      cibleVie(0),
      expect.objectContaining({ duration: cibleVie(0) }),
    );
    expect(result.current.c.set).toHaveBeenCalledTimes(1);
  });

  it("restarts at a touch from where the clock stands, and writes nothing else", async () => {
    const { result } = await renderHook(() => useHorloge());
    result.current.c.value = 6000; // mid-wave
    jest.mocked(withTiming).mockClear();
    await act(() => result.current.touche());
    const cible = cibleVie(6000);
    expect(withTiming).toHaveBeenCalledWith(
      cible,
      expect.objectContaining({ duration: cible - 6000 }),
    );
    expect(result.current.c.set).toHaveBeenCalledTimes(2);
  });

  it("does not start out of focus, and rests the sails", async () => {
    mockFocus = false;
    const { result } = await renderHook(() => useHorloge());
    await act(() => result.current.touche());
    expect(withTiming).not.toHaveBeenCalled();
    expect(result.current.c.value % CYCLE_MS).toBe(0);
  });

  it("does not start with reduced motion", async () => {
    mockReduit = true;
    const { result } = await renderHook(() => useHorloge());
    await act(() => result.current.touche());
    expect(withTiming).not.toHaveBeenCalled();
  });

  it("a touch captured before reduced motion came on starts nothing", async () => {
    const { rerender, result } = await renderHook(() => useHorloge());
    const ancien = result.current.touche;
    expect(withTiming).toHaveBeenCalledTimes(1);
    mockReduit = true;
    await act(() => rerender({}));
    await act(() => ancien());
    expect(withTiming).toHaveBeenCalledTimes(1);
  });

  it("cancels the running timing when the map unmounts mid-wave", async () => {
    const { result, unmount } = await renderHook(() => useHorloge());
    expect(cancelAnimation).not.toHaveBeenCalled();
    await unmount();
    expect(cancelAnimation).toHaveBeenCalledWith(result.current.c);
  });

  // The clock only ever grows: a step back put a crow already flying away (t < 0) on its perch again.
  it("rests the sails forward, never back, when the focus goes mid-wave", async () => {
    const { rerender, result } = await renderHook(() => useHorloge());
    result.current.c.value = 6000; // early in a cycle: rounding would go back to 5000
    mockFocus = false;
    await act(() => rerender({}));
    expect(result.current.c.value).toBe(10000);
  });

  it("starts again on return to focus, and cancels on leaving", async () => {
    const { rerender, result } = await renderHook(() => useHorloge());
    expect(withTiming).toHaveBeenCalledTimes(1);
    mockFocus = false;
    await act(() => rerender({}));
    expect(cancelAnimation).toHaveBeenCalledTimes(1);
    expect(result.current.c.value % CYCLE_MS).toBe(0);
    mockFocus = true;
    await act(() => rerender({}));
    expect(withTiming).toHaveBeenCalledTimes(2);
  });
});
