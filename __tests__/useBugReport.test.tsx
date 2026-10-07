import { act, fireEvent, render, renderHook, screen } from "@testing-library/react-native";
import { Alert, Pressable } from "react-native";
import { TamaguiProvider } from "tamagui";

import { useBugReport } from "@/hooks/useBugReport";
import config from "@/tamagui.config";

/**
 * What is pinned here is state, not navigation: the alert's report button must end in
 * `Linking.openURL` on the built `mailto:` — the one way a report leaves the device.
 */

const mockShownErrors: string[] = [];
// The reminders' line has its own test (reminder-report.test.ts); here it is absent, as on a phone
// that never used them.
jest.mock("@/src/reminderReport", () => ({ reminderReportLine: async () => null }));
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
  readErrorLog: jest.fn(async (kind?: string) => {
    await Promise.resolve();
    return kind === "event"
      ? [{ at: "2026-10-07T20:25:52.749Z", context: "expedition.noFix", message: "m", stack: null }]
      : [];
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

// biome-ignore lint/style/useComponentExportOnlyModules: a test file exports nothing
function Probe() {
  const { alertWithReport, dialog } = useBugReport();
  return (
    <>
      <Pressable testID="fail" onPress={() => alertWithReport("backup.exportFailed")} />
      {dialog}
    </>
  );
}

async function mountProbe() {
  await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <Probe />
    </TamaguiProvider>,
  );
  await fireEvent.press(screen.getByTestId("fail"));
}

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

  test("alertWithReport shows the message in the in-app dialog, with a close and a report button", async () => {
    const alertSpy = jest.spyOn(Alert, "alert");
    await mountProbe();
    expect(alertSpy).not.toHaveBeenCalled();
    expect(screen.getByText("common.error")).toBeTruthy();
    expect(screen.getByText("backup.exportFailed")).toBeTruthy();
    expect(screen.getByText("common.close")).toBeTruthy();
    expect(screen.getByText("feedback.report_cta")).toBeTruthy();
  });

  test("close dismisses it and nothing is opened; hardware back is the same", async () => {
    await mountProbe();
    await fireEvent.press(screen.getByTestId("confirm-dialog-cancel"));
    expect(screen.queryByText("backup.exportFailed")).toBeNull();

    await fireEvent.press(screen.getByTestId("fail"));
    await act(async () => {
      await fireEvent(screen.getByTestId("confirm-dialog"), "requestClose");
      await Promise.resolve();
    });
    expect(screen.queryByText("backup.exportFailed")).toBeNull();
    expect(mockOpened).toEqual([]);
  });

  test("the report button opens the built mailto in the hero's own mail app", async () => {
    await mountProbe();
    await act(async () => {
      await fireEvent.press(screen.getByTestId("confirm-dialog-confirm"));
      await Promise.resolve();
    });
    expect(mockOpened).toEqual(["mailto:test@example.com?subject=x"]);
    expect(screen.queryByText("backup.exportFailed")).toBeNull();
  });

  // The event log is a second row the hook has to read and hand over, or the mail's events
  // section is a template nobody fills.
  test("the mail carries the event log, under its own header", async () => {
    const { buildBugReportMailto } = jest.requireMock("@/src/crashLog") as {
      buildBugReportMailto: jest.Mock;
    };
    const { result } = await renderHook(() => useBugReport());

    await act(async () => {
      await result.current.openBugReport();
    });

    const [, handled, , strings, , events] = buildBugReportMailto.mock.calls[0] ?? [];
    expect(handled).toEqual([]);
    expect(strings.eventsHeader).toBe("feedback.events_header");
    expect(events).toEqual([expect.objectContaining({ context: "expedition.noFix" })]);
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
