import { renderHook } from "@testing-library/react-native";

import { useSetAside } from "@/hooks/useSetAside";

/**
 * The one door every screen sets an exercise aside through. The writes are `db/setAside`'s and
 * tested there on a real database; this is the half a screen relies on: the toast and its "Put
 * back", the screen told when that undo lands, and a failure that resolves rather than throws.
 */

const mockWritten: number[] = [];
const mockPutBack: number[] = [];
let mockFail = false;
jest.mock("@/db/setAside", () => ({
  setExerciseAside: (id: number) => {
    if (mockFail) return Promise.reject(new Error("disk full"));
    mockWritten.push(id);
    return Promise.resolve();
  },
  putExerciseBack: (id: number) => {
    if (mockFail) return Promise.reject(new Error("disk full"));
    mockPutBack.push(id);
    return Promise.resolve();
  },
}));

type Shown = { message: string; action?: { label: string; onPress: () => void } };
const mockToasts: Shown[] = [];
jest.mock("@/components/common/Toast", () => ({
  useToast: () => ({
    showSuccess: (message: string, options?: { action?: Shown["action"] }) =>
      mockToasts.push({ message, action: options?.action }),
  }),
}));

const mockReported: string[] = [];
jest.mock("@/src/reportError", () => ({
  reportError: (context: string) => mockReported.push(context),
}));

jest.mock("@/stores/settings", () => ({
  useSettingsStore: (selector: (s: { language: string }) => unknown) =>
    selector({ language: "en" }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const starJump = { id: 1, enName: "Star Jump", frName: "Saut en étoile" } as never;

/** Lets the undo's write and the toast after it settle. */
const settle = () => new Promise((resolve) => setImmediate(resolve));

beforeEach(() => {
  mockWritten.length = 0;
  mockPutBack.length = 0;
  mockToasts.length = 0;
  mockReported.length = 0;
  mockFail = false;
});

test("setting aside writes it and says so, with a Put back on the toast", async () => {
  const { result } = await renderHook(() => useSetAside());

  expect(await result.current.setAside(starJump, () => {})).toBe(true);

  expect(mockWritten).toEqual([1]);
  expect(mockToasts).toHaveLength(1);
  expect(mockToasts[0]?.message).toBe("setAside.done");
  expect(mockToasts[0]?.action?.label).toBe("setAside.put_back");
});

test("Put back on the toast hands it back and tells the screen that raised it", async () => {
  const onUndone = jest.fn();
  const { result } = await renderHook(() => useSetAside());
  await result.current.setAside(starJump, onUndone);

  mockToasts[0]?.action?.onPress();
  await settle();

  expect(mockPutBack).toEqual([1]);
  expect(onUndone).toHaveBeenCalledTimes(1);
  expect(mockToasts.map((s) => s.message)).toEqual(["setAside.done", "setAside.back"]);
});

// The exercise page's own button turns into "Put back": a second one on the toast would be a
// second copy of the state it cannot see.
test("null asks for no Put back on the toast", async () => {
  const { result } = await renderHook(() => useSetAside());

  await result.current.setAside(starJump, null);

  expect(mockToasts[0]?.action).toBeUndefined();
});

test("a failed write resolves false, says nothing was done, and reports it", async () => {
  mockFail = true;
  const { result } = await renderHook(() => useSetAside());

  expect(await result.current.setAside(starJump, () => {})).toBe(false);
  expect(await result.current.putBack(starJump)).toBe(false);
  expect(mockToasts).toEqual([]);
  expect(mockReported).toEqual(["setAside.write", "setAside.putBack"]);
});
