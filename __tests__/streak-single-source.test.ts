import assert from "node:assert/strict";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { StreakInfo } from "@/db/streaks";

/**
 * Pins the bug the audit found: Journal's top card froze at "0 jours / Record 0" while the
 * calendar card on the same screen showed 2 — both called `getStreakInfo()`, but the top card's
 * `.catch(() => {})` swallowed a transient failure and never refetched. `useStreakInfo` is now
 * the one way every reader gets the flame, and it heals on the next focus instead of freezing.
 */

const mockGetStreakInfo = jest.fn();
jest.mock("@/db/streaks", () => ({ getStreakInfo: () => mockGetStreakInfo() }));

// expo-router's real useFocusEffect only reruns its callback when a screen regains focus, which
// jest never does. This captures the latest callback so a test can invoke it again to simulate a
// second focus, without requireActual (db/streaks/expo-router don't import cleanly in jest — see
// __tests__/db-client-smoke.test.ts).
let focusCallback: (() => undefined | (() => void)) | null = null;
jest.mock("expo-router", () => ({
  useFocusEffect: (cb: () => undefined | (() => void)) => {
    const { useEffect } = require("react");
    useEffect(() => {
      focusCallback = cb;
      return cb();
    }, [cb]);
  },
}));

jest.mock("@/src/reportError", () => ({ reportError: jest.fn() }));

import { useStreakInfo } from "@/hooks/useStreakInfo";

describe("useStreakInfo", () => {
  beforeEach(() => {
    mockGetStreakInfo.mockReset();
    focusCallback = null;
  });

  it("delivers the streak the db computed", async () => {
    mockGetStreakInfo.mockResolvedValue({
      current: 2,
      best: 2,
      isActive: true,
      lastWorkoutDate: "2026-08-23",
    });

    const { result } = await renderHook(() => useStreakInfo());
    await waitFor(() => expect(result.current?.current).toBe(2));
    assert(result.current);
    expect(result.current.best).toBe(2);
  });

  it("retries on next focus instead of freezing zeros after one failure", async () => {
    mockGetStreakInfo
      .mockRejectedValueOnce(new Error("db warming up"))
      .mockResolvedValue({ current: 2, best: 2, isActive: true, lastWorkoutDate: "2026-08-23" });

    const { result } = await renderHook(() => useStreakInfo());
    await waitFor(() => expect(mockGetStreakInfo).toHaveBeenCalledTimes(1));
    // Still null after the first, failed read — nothing is frozen at a fake zero.
    expect(result.current).toBeNull();

    // Simulate the screen regaining focus a second time.
    await act(() => {
      focusCallback?.();
    });

    await waitFor(() => expect(result.current?.current).toBe(2));
  });

  it("ignores a read that resolves after the screen has already lost focus", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    let resolveRead: ((info: StreakInfo) => void) | undefined;
    mockGetStreakInfo.mockImplementation(
      () =>
        new Promise<StreakInfo>((resolve) => {
          resolveRead = resolve;
        }),
    );

    const { unmount } = await renderHook(() => useStreakInfo());
    await waitFor(() => expect(mockGetStreakInfo).toHaveBeenCalledTimes(1));

    await unmount();
    await act(async () => {
      resolveRead?.({ current: 9, best: 9, isActive: true, lastWorkoutDate: "2026-08-23" });
      await Promise.resolve();
    });

    // A setState on the unmounted hook would surface as a React console.error; the `cancelled`
    // guard is what keeps this call silent.
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
