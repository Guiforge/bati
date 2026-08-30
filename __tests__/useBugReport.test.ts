import { act, renderHook } from "@testing-library/react-native";
import { Alert } from "react-native";

import { useBugReport } from "@/hooks/useBugReport";

/**
 * What is pinned here is state, not navigation: the alert's report button must end in
 * `Linking.openURL` on the built `mailto:` — the one way a report leaves the device.
 */

const mockShownErrors: string[] = [];
jest.mock("@/components/common/Toast", () => ({
  useToast: () => ({
    showError: (message: string) => mockShownErrors.push(message),
    showSuccess: jest.fn(),
  }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock("@/src/crashLog", () => ({
  readCrashLog: jest.fn(async () => {
    await Promise.resolve();
    return [{ at: "2026-08-30T09:00:00.000Z", context: "fatal", message: "boom", stack: null }];
  }),
  readErrorLog: jest.fn(async () => {
    await Promise.resolve();
    return [];
  }),
  buildBugReportMailto: jest.fn(() => "mailto:test@example.com?subject=x"),
}));

let mockCanOpen = true;
const mockOpened: string[] = [];
jest.mock("expo-linking", () => ({
  canOpenURL: jest.fn(() => Promise.resolve(mockCanOpen)),
  openURL: jest.fn((url: string) => {
    mockOpened.push(url);
    return Promise.resolve();
  }),
}));

const mockReportedErrors: string[] = [];
jest.mock("@/src/reportError", () => ({
  reportError: (context: string) => mockReportedErrors.push(context),
}));

beforeEach(() => {
  mockShownErrors.length = 0;
  mockOpened.length = 0;
  mockReportedErrors.length = 0;
  mockCanOpen = true;
  jest.clearAllMocks();
});

describe("useBugReport", () => {
  test("counts crashes only — the row must never announce reports on a healthy app", async () => {
    const { result } = await renderHook(() => useBugReport());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.crashCount).toBe(1);
  });

  test("alertWithReport shows the message with a close and a report button", async () => {
    const alertSpy = jest.spyOn(Alert, "alert");
    const { result } = await renderHook(() => useBugReport());

    await act(() => {
      result.current.alertWithReport("backup.exportFailed");
    });

    expect(alertSpy).toHaveBeenCalledWith("common.error", "backup.exportFailed", [
      expect.objectContaining({ text: "common.close", style: "cancel" }),
      expect.objectContaining({ text: "feedback.report_cta" }),
    ]);
  });

  test("the report button opens the built mailto in the hero's own mail app", async () => {
    const alertSpy = jest.spyOn(Alert, "alert");
    const { result } = await renderHook(() => useBugReport());

    await act(() => {
      result.current.alertWithReport("backup.exportFailed");
    });
    const buttons = alertSpy.mock.calls[0]?.[2];
    await act(async () => {
      buttons?.[1]?.onPress?.();
      await Promise.resolve();
    });

    expect(mockOpened).toEqual(["mailto:test@example.com?subject=x"]);
  });

  test("a device with no visible mail app is told so, and nothing is opened", async () => {
    mockCanOpen = false;
    const { result } = await renderHook(() => useBugReport());

    await act(async () => {
      await result.current.openBugReport();
    });

    expect(mockShownErrors).toEqual(["settings.no_mail_client"]);
    expect(mockOpened).toEqual([]);
  });
});
