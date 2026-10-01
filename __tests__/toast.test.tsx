import { act, fireEvent, renderHook, screen, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

import { ToastProvider, useToast } from "@/components/common/Toast";
import config from "@/tamagui.config";

/**
 * The toast takes the tap now. It let every tap through to whatever sat under it, so tapping it
 * away pressed the control it covered: on the warm-up, the "not for me" that had just raised it,
 * which set the next movement aside too (issue #145, found testing on a device).
 */

jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => true }));

const wrapper = ({ children }: { children: ReactNode }) => (
  <SafeAreaProvider
    initialMetrics={{
      frame: { x: 0, y: 0, width: 390, height: 844 },
      insets: { top: 0, left: 0, right: 0, bottom: 0 },
    }}
  >
    <TamaguiProvider config={config} defaultTheme="dark">
      <ToastProvider>{children}</ToastProvider>
    </TamaguiProvider>
  </SafeAreaProvider>
);

test("a tap on the toast takes it away", async () => {
  const { result } = await renderHook(() => useToast(), { wrapper });
  await act(() => result.current.showSuccess("Saved"));
  expect(screen.getByText("Saved")).toBeTruthy();

  await fireEvent.press(screen.getByTestId("toast"));

  await waitFor(() => expect(screen.queryByText("Saved")).toBeNull());
});

test("its action runs once and takes the toast with it", async () => {
  const onPress = jest.fn();
  const { result } = await renderHook(() => useToast(), { wrapper });
  await act(() =>
    result.current.showSuccess("Set aside", { action: { label: "Put back", onPress } }),
  );

  const button = screen.getByTestId("toast-action");
  await fireEvent.press(button);
  // A second tap while the toast is on its way out must not undo twice.
  await fireEvent.press(button);

  expect(onPress).toHaveBeenCalledTimes(1);
  await waitFor(() => expect(screen.queryByText("Set aside")).toBeNull());
});
