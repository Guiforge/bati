import { act, renderHook, waitFor } from "@testing-library/react-native";

import { useBackup } from "@/hooks/useBackup";
import { useRestoreStore } from "@/stores/restore";

/**
 * The hook is where the safety promise lives, and the promise is about *order*: a backup is
 * validated before anything is copied, and the app only hands itself over to the swap once both
 * have succeeded. Nothing in the type system stops a future edit from taking the safety copy
 * first, or from starting a restore on a file that was rejected — so it is pinned here.
 *
 * Calls are recorded in one shared list rather than asserted per-mock, because the ordering
 * *between* them is the whole point; asserting each was called would pass on the broken version.
 */

const mockCalls: string[] = [];
let mockStagedPath: string | null = "/tmp/staged.db";
let mockValidation: { ok: true } | { ok: false; reason: string } = { ok: true };
let mockExportBehaviour: () => void = () => {};
let mockSafetyCopyBehaviour: () => void = () => {};

jest.mock("@/db/backup", () => ({
  // biome-ignore lint/suspicious/useAwait: mirrors the real Promise-returning signature
  validateBackup: jest.fn(async () => {
    mockCalls.push("validate");
    return mockValidation;
  }),
}));

jest.mock("@/src/backupFiles", () => ({
  // biome-ignore lint/suspicious/useAwait: mirrors the real Promise-returning signature
  exportBackup: jest.fn(async () => {
    mockCalls.push("export");
    mockExportBehaviour();
  }),
  // biome-ignore lint/suspicious/useAwait: mirrors the real Promise-returning signature
  stageBackupForImport: jest.fn(async () => {
    mockCalls.push("stage");
    return mockStagedPath;
  }),
  discardStagedImport: jest.fn(() => mockCalls.push("discard")),
  // biome-ignore lint/suspicious/useAwait: mirrors the real Promise-returning signature
  takeSafetyCopy: jest.fn(async () => {
    mockCalls.push("safetyCopy");
    mockSafetyCopyBehaviour();
  }),
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
  mockSafetyCopyBehaviour = () => {};
  useRestoreStore.setState({ phase: "idle" });
});

describe("useBackup — import", () => {
  test("validates before copying anything, then hands over to the swap", async () => {
    const { result } = await renderHook(() => useBackup());

    await act(async () => result.current.runImport());

    expect(mockCalls).toEqual(["stage", "validate", "safetyCopy"]);
    expect(useRestoreStore.getState().phase).toBe("restoring");
  });

  test("a rejected backup is discarded, and the app is never handed over", async () => {
    mockValidation = { ok: false, reason: "notBati" };
    const { result } = await renderHook(() => useBackup());

    await act(async () => result.current.runImport());

    expect(mockCalls).toEqual(["stage", "validate", "discard"]);
    expect(mockCalls).not.toContain("safetyCopy");
    expect(useRestoreStore.getState().phase).toBe("idle");
    expect(mockShownErrors).toEqual(["backup.rejected.notBati"]);
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
    mockSafetyCopyBehaviour = () => {
      throw new Error("no space left on device");
    };
    const { result } = await renderHook(() => useBackup());

    await act(async () => result.current.runImport());

    expect(mockCalls).toEqual(["stage", "validate", "safetyCopy", "discard"]);
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
