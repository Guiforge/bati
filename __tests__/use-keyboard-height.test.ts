import { act, renderHook } from "@testing-library/react-native";
import { Keyboard } from "react-native";
import { useKeyboardHeight } from "@/components/common/useKeyboardHeight";

test("reports the keyboard's height while it is up and 0 once it is gone", async () => {
  const handlers: Record<string, (e: unknown) => void> = {};
  jest.spyOn(Keyboard, "addListener").mockImplementation(((name: string, fn: () => void) => {
    handlers[name] = fn;
    return { remove: jest.fn() };
  }) as unknown as typeof Keyboard.addListener);

  const { result } = await renderHook(() => useKeyboardHeight());
  expect(result.current).toBe(0);

  await act(() => handlers.keyboardDidShow?.({ endCoordinates: { height: 300 } }));
  expect(result.current).toBe(300);

  await act(() => handlers.keyboardDidHide?.({}));
  expect(result.current).toBe(0);
});

test("scrolls the given view to its end when the keyboard rises, and only then", async () => {
  const handlers: Record<string, (e: unknown) => void> = {};
  jest.spyOn(Keyboard, "addListener").mockImplementation(((name: string, fn: () => void) => {
    handlers[name] = fn;
    return { remove: jest.fn() };
  }) as unknown as typeof Keyboard.addListener);
  jest.spyOn(globalThis, "requestAnimationFrame").mockImplementation((cb) => {
    cb(0);
    return 0;
  });
  const scrollToEnd = jest.fn();
  const ref = { current: { scrollToEnd } as never };

  await renderHook(() => useKeyboardHeight(ref));
  expect(scrollToEnd).not.toHaveBeenCalled();
  await act(() => handlers.keyboardDidShow?.({ endCoordinates: { height: 300 } }));
  expect(scrollToEnd).toHaveBeenCalledTimes(1);
  await act(() => handlers.keyboardDidHide?.({}));
  expect(scrollToEnd).toHaveBeenCalledTimes(1);
});
