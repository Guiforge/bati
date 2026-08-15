import { act, renderHook, waitFor } from "@testing-library/react-native";

import { useBackup } from "@/hooks/useBackup";
import { useRestoreStore } from "@/stores/restore";

/**
 * The hook is where the safety promise lives, and the promise is about *order*: a backup is
 * validated before the app hands itself over to the swap. Nothing in the type system stops a
 * future edit from starting a restore on a file that was rejected — so it is pinned here.
 *
 * Calls are recorded in one shared list rather than asserted per-mock, because the ordering
 * *between* them is the whole point; asserting each was called would pass on the broken version.
 */

const mockCalls: string[] = [];
let mockStagedPath: string | null = "/tmp/staged.db";
let mockValidation: { ok: true } | { ok: false; reason: string } = { ok: true };
let mockExportBehaviour: () => void = () => {};
let mockValidateBehaviour: () => void = () => {};
let mockStageGate: Promise<void> | null = null;

jest.mock("@/db/backup", () => ({
  validateBackup: jest.fn(async () => {
    mockCalls.push("validate");
    await Promise.resolve();
    mockValidateBehaviour();
    return mockValidation;
  }),
}));

jest.mock("@/src/backupFiles", () => ({
  // biome-ignore lint/suspicious/useAwait: mirrors the real Promise-returning signature
  exportBackup: jest.fn(async () => {
    mockCalls.push("export");
    mockExportBehaviour();
  }),
  stageBackupForImport: jest.fn(async () => {
    mockCalls.push("stage");
    // The picker is the one await long enough for a second press to land inside it.
    if (mockStageGate) await mockStageGate;
    return mockStagedPath;
  }),
  discardStagedImport: jest.fn(() => mockCalls.push("discard")),
}));

const mockShownErrors: string[] = [];
const mockShownSuccesses: string[] = [];
jest.mock("@/components/common/Toast", () => ({
  useToast: () => ({
    showError: (message: string) => mockShownErrors.push(message),
    showSuccess: (message: string) => mockShownSuccesses.push(message),
  }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockReportedErrors: string[] = [];
jest.mock("@/src/reportError", () => ({
  reportError: (context: string) => mockReportedErrors.push(context),
}));

beforeEach(() => {
  mockCalls.length = 0;
  mockShownErrors.length = 0;
  mockShownSuccesses.length = 0;
  mockReportedErrors.length = 0;
  mockStagedPath = "/tmp/staged.db";
  mockValidation = { ok: true };
  mockExportBehaviour = () => {};
  mockValidateBehaviour = () => {};
  mockStageGate = null;
  useRestoreStore.setState({ phase: "idle" });
});

describe("useBackup — import", () => {
  test("validates before handing over to the swap", async () => {
    const { result } = await renderHook(() => useBackup());

    await act(async () => result.current.runImport());

    expect(mockCalls).toEqual(["stage", "validate"]);
    expect(useRestoreStore.getState().phase).toBe("restoring");
  });

  test("a rejected backup is discarded, and the app is never handed over", async () => {
    mockValidation = { ok: false, reason: "notBati" };
    const { result } = await renderHook(() => useBackup());

    await act(async () => result.current.runImport());

    expect(mockCalls).toEqual(["stage", "validate", "discard"]);
    expect(useRestoreStore.getState().phase).toBe("idle");
    expect(mockShownErrors).toEqual(["backup.rejected.notBati"]);
  });

  /**
   * Both imports share one staged filename, so a second run started while the first is still in
   * the picker replaces the file the first has already validated — and the swap then commits a
   * database nothing checked. `busy` alone cannot stop it: two presses in the same frame both
   * read the state as it was before either render.
   */
  test("a second press while the picker is open is ignored, not staged twice", async () => {
    let openPicker: () => void = () => {};
    mockStageGate = new Promise<void>((resolve) => {
      openPicker = resolve;
    });
    const { result } = await renderHook(() => useBackup());

    await act(async () => {
      result.current.runImport();
      result.current.runImport();
      openPicker();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockCalls).toEqual(["stage", "validate"]);
  });

  test("the rejection reason reaches the user rather than a generic failure", async () => {
    mockValidation = { ok: false, reason: "incompatibleVersion" };
    const { result } = await renderHook(() => useBackup());

    await act(async () => result.current.runImport());

    expect(mockShownErrors).toEqual(["backup.rejected.incompatibleVersion"]);
  });

  test("backing out of the picker changes nothing and says nothing", async () => {
    mockStagedPath = null;
    const { result } = await renderHook(() => useBackup());

    await act(async () => result.current.runImport());

    expect(mockCalls).toEqual(["stage"]);
    expect(mockShownErrors).toEqual([]);
    expect(useRestoreStore.getState().phase).toBe("idle");
  });

  test("an unexpected failure discards the staged file instead of leaving it behind", async () => {
    mockValidateBehaviour = () => {
      throw new Error("no space left on device");
    };
    const { result } = await renderHook(() => useBackup());

    await act(async () => result.current.runImport());

    expect(mockCalls).toEqual(["stage", "validate", "discard"]);
    expect(useRestoreStore.getState().phase).toBe("idle");
    expect(mockShownErrors).toEqual(["backup.importFailed"]);
    expect(mockReportedErrors).toEqual(["backup.import"]);
  });

  test("busy goes back down after a rejection, so the row is not stuck", async () => {
    mockValidation = { ok: false, reason: "corrupt" };
    const { result } = await renderHook(() => useBackup());

    await act(async () => result.current.runImport());

    await waitFor(() => expect(result.current.busy).toBe(false));
  });
});

describe("useBackup — export", () => {
  test("reports success without touching the restore phase", async () => {
    const { result } = await renderHook(() => useBackup());

    await act(async () => result.current.runExport());

    expect(mockCalls).toEqual(["export"]);
    expect(mockShownSuccesses).toEqual(["backup.exportDone"]);
    expect(useRestoreStore.getState().phase).toBe("idle");
  });

  test("a failure is surfaced to the user and recorded, never swallowed", async () => {
    mockExportBehaviour = () => {
      throw new Error("no space left on device");
    };
    const { result } = await renderHook(() => useBackup());

    await act(async () => result.current.runExport());

    expect(mockShownErrors).toEqual(["backup.exportFailed"]);
    expect(mockReportedErrors).toEqual(["backup.export"]);
  });
});
