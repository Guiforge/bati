import { renderHook } from "@testing-library/react-native";
import { Alert, type AlertButton } from "react-native";

import { useSetAside } from "@/hooks/useSetAside";

/**
 * The one door every screen sets an exercise aside through. The writes are `db/setAside`'s and
 * tested there on a real database; this is the half a screen relies on: the jumps question, what
 * the promise resolves to, and that a failure resolves rather than throws.
 */

const mockWritten: number[] = [];
let mockOtherJumps: { id: number; enName: string }[] = [];
let mockFail = false;
jest.mock("@/db/setAside", () => ({
  setExerciseAside: (id: number) => {
    if (mockFail) return Promise.reject(new Error("disk full"));
    mockWritten.push(id);
    return Promise.resolve();
  },
  putExerciseBack: () => (mockFail ? Promise.reject(new Error("disk full")) : Promise.resolve()),
  otherJumps: async () => mockOtherJumps,
}));

const mockToasts: string[] = [];
jest.mock("@/components/common/Toast", () => ({
  useToast: () => ({ showSuccess: (message: string) => mockToasts.push(message) }),
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

/** Answers the Alert with the button whose label key is given. */
function answerWith(key: string) {
  return jest.spyOn(Alert, "alert").mockImplementation((_title, _body, buttons) => {
    (buttons as AlertButton[]).find((b) => b.text === key)?.onPress?.();
  });
}

beforeEach(() => {
  mockWritten.length = 0;
  mockToasts.length = 0;
  mockReported.length = 0;
  mockOtherJumps = [];
  mockFail = false;
  jest.restoreAllMocks();
});

test("one exercise, no question asked, one name back", async () => {
  const alert = jest.spyOn(Alert, "alert");
  const { result } = await renderHook(() => useSetAside());

  const done = await result.current.setAside(starJump);

  expect([...(done ?? [])]).toEqual(["Star Jump"]);
  expect(alert).not.toHaveBeenCalled();
  expect(mockToasts).toEqual(["setAside.done"]);
});

test("a jump asks about the others, and All of them sets every one aside", async () => {
  mockOtherJumps = [
    { id: 2, enName: "Jumping Jack" },
    { id: 3, enName: "Burpee" },
  ];
  answerWith("setAside.also_jumps_yes");
  const { result } = await renderHook(() => useSetAside());

  const done = await result.current.setAside(starJump);

  expect([...(done ?? [])].sort()).toEqual(["Burpee", "Jumping Jack", "Star Jump"]);
  expect(mockWritten).toEqual([1, 2, 3]);
  expect(mockToasts).toEqual(["setAside.done_many"]);
});

test("Just this one leaves the other jumps alone", async () => {
  mockOtherJumps = [{ id: 2, enName: "Jumping Jack" }];
  answerWith("setAside.also_jumps_no");
  const { result } = await renderHook(() => useSetAside());

  const done = await result.current.setAside(starJump);

  expect([...(done ?? [])]).toEqual(["Star Jump"]);
  expect(mockWritten).toEqual([1]);
});

test("a failed write resolves null and says nothing was done", async () => {
  mockFail = true;
  const { result } = await renderHook(() => useSetAside());

  expect(await result.current.setAside(starJump)).toBeNull();
  expect(await result.current.putBack(starJump)).toBe(false);
  expect(mockToasts).toEqual([]);
  expect(mockReported).toEqual(["setAside.write", "setAside.putBack"]);
});
