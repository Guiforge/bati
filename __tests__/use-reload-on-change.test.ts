import { renderHook, waitFor } from "@testing-library/react-native";
import { act } from "react";

import { useReloadOnChange } from "@/hooks/useReloadOnChange";

/**
 * Home's gate: a return to the tab re-reads only what a write or a new day could have changed.
 * Asserted by counting loads, since that is the whole of what the gate buys.
 */

let mockVersion = "1|2026-09-15";
jest.mock("@/db/changeVersion", () => ({ getChangeVersion: async () => mockVersion }));

const mockReported: string[] = [];
jest.mock("@/src/reportError", () => ({
  reportError: (context: string) => mockReported.push(context),
}));

// A focus is the effect running; a blur is its cleanup. `focus()` replays both.
let mockFocus: (() => undefined | (() => void)) | null = null;
let mockBlur: (() => void) | undefined;
jest.mock("expo-router", () => ({
  useFocusEffect: (effect: () => undefined | (() => void)) => {
    mockFocus = effect;
  },
}));

async function focus(): Promise<void> {
  mockBlur?.();
  await act(async () => {
    mockBlur = mockFocus?.() ?? undefined;
    // Lets the version read and the load it gates settle inside `act`.
    await Promise.resolve();
  });
}

beforeEach(() => {
  mockVersion = "1|2026-09-15";
  mockReported.length = 0;
  mockFocus = null;
  mockBlur = undefined;
});

test("a return with nothing written loads nothing", async () => {
  const load = jest.fn().mockResolvedValue(undefined);
  await renderHook(() => useReloadOnChange("test", load));

  await focus();
  await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
  await focus();
  await focus();
  expect(load).toHaveBeenCalledTimes(1);

  mockVersion = "2|2026-09-15";
  await focus();
  await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
});

test("a failed load is reported and tried again on the next look", async () => {
  const load = jest.fn().mockRejectedValueOnce(new Error("disk")).mockResolvedValue(undefined);
  await renderHook(() => useReloadOnChange("home.test", load));

  await focus();
  await waitFor(() => expect(mockReported).toEqual(["home.test"]));
  await focus();
  await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
  await focus();
  expect(load).toHaveBeenCalledTimes(2);
});

test("a new load, its language changed, runs whatever the version", async () => {
  const first = jest.fn().mockResolvedValue(undefined);
  const second = jest.fn().mockResolvedValue(undefined);
  type Props = { load: () => Promise<unknown> };
  const { rerender } = await renderHook(({ load }: Props) => useReloadOnChange("test", load), {
    initialProps: { load: first } as Props,
  });

  await focus();
  await waitFor(() => expect(first).toHaveBeenCalledTimes(1));
  await rerender({ load: second });
  await focus();
  await waitFor(() => expect(second).toHaveBeenCalledTimes(1));
});
