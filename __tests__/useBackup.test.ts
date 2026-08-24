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
let mockSaveOutcome: () => boolean = () => true;

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
  // biome-ignore lint/suspicious/useAwait: mirrors the real Promise-returning signature
  saveBackupToFolder: jest.fn(async () => {
    mockCalls.push("save");
    return mockSaveOutcome();
  }),
}));

let mockAutoFolderOutcome: () => string | null = () => null;
let mockEnableOutcome: () => string | null = () => "Documents/Bati";
let mockDisableOutcome: () => void = () => {};

jest.mock("@/src/autoBackup", () => ({
  autoBackupFolder: jest.fn(async () => {
    await Promise.resolve();
    return mockAutoFolderOutcome();
  }),
  enableAutoBackup: jest.fn(async () => {
    await Promise.resolve();
    mockCalls.push("enable");
    return mockEnableOutcome();
  }),
  disableAutoBackup: jest.fn(async () => {
    await Promise.resolve();
    mockCalls.push("disable");
    mockDisableOutcome();
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
  mockValidateBehaviour = () => {};
  mockStageGate = null;
  mockSaveOutcome = () => true;
  mockAutoFolderOutcome = () => null;
  mockEnableOutcome = () => "Documents/Bati";
  mockDisableOutcome = () => {};
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

describe("useBackup — save to a folder", () => {
  test("reports success once the file is written", async () => {
    const { result } = await renderHook(() => useBackup());

    await act(async () => result.current.runSaveToFolder());

    expect(mockCalls).toEqual(["save"]);
    expect(mockShownSuccesses).toEqual(["backup.saveDone"]);
  });

  /**
   * The folder picker throws when the hero backs out, so the file layer translates that into
   * `false`. Toasting either outcome here would announce a failure that did not happen, or a
   * success for a file that was never written.
   */
  test("says nothing when the hero backs out of the picker", async () => {
    mockSaveOutcome = () => false;
    const { result } = await renderHook(() => useBackup());

    await act(async () => result.current.runSaveToFolder());

    expect(mockShownSuccesses).toEqual([]);
    expect(mockShownErrors).toEqual([]);
    expect(mockReportedErrors).toEqual([]);
  });

  test("a real failure is surfaced and recorded, never swallowed", async () => {
    mockSaveOutcome = () => {
      throw new Error("no space left on device");
    };
    const { result } = await renderHook(() => useBackup());

    await act(async () => result.current.runSaveToFolder());

    expect(mockShownErrors).toEqual(["backup.exportFailed"]);
    expect(mockReportedErrors).toEqual(["backup.save"]);
  });
});

describe("useBackup — automatic backup", () => {
  /**
   * The row is the only place a hero can see that automatic backups are still on, and
   * `backupBeforeMigrations` turns them off by clearing the preference when a folder stops
   * working. So the label has to come from storage on every mount, never from a flag the app
   * kept in memory since the day it was switched on.
   */
  test("shows the folder storage actually holds", async () => {
    mockAutoFolderOutcome = () => "Documents/Bati";

    const { result } = await renderHook(() => useBackup());

    await waitFor(() => expect(result.current.autoFolder).toBe("Documents/Bati"));
  });

  test("turning it on shows the folder back, so 'on' names a place", async () => {
    const { result } = await renderHook(() => useBackup());

    await act(async () => result.current.runEnableAuto());

    expect(mockCalls).toEqual(["enable"]);
    expect(result.current.autoFolder).toBe("Documents/Bati");
    expect(mockShownSuccesses).toEqual(["backup.autoOnDone"]);
  });

  test("backing out of the picker leaves the row off and says nothing", async () => {
    mockEnableOutcome = () => null;
    const { result } = await renderHook(() => useBackup());

    await act(async () => result.current.runEnableAuto());

    expect(result.current.autoFolder).toBeNull();
    expect(mockShownSuccesses).toEqual([]);
    expect(mockShownErrors).toEqual([]);
  });

  /**
   * The folder is remembered only after its first write succeeds, so a failure here must leave
   * the row saying exactly what is true: off. A row that read "on" after a failed enable would
   * be the invisible state this whole feature exists to avoid.
   */
  test("a failure to turn it on leaves the row off, surfaced and recorded", async () => {
    mockEnableOutcome = () => {
      throw new Error("permission denied");
    };
    const { result } = await renderHook(() => useBackup());

    await act(async () => result.current.runEnableAuto());

    expect(result.current.autoFolder).toBeNull();
    expect(mockShownErrors).toEqual(["backup.exportFailed"]);
    expect(mockReportedErrors).toEqual(["backup.auto.enable"]);
  });

  /**
   * A read that fails must land the row on "Off", not on a stale label: the only thing worse
   * than not knowing whether backups are on is being told they are when nobody can tell.
   */
  test("a folder that cannot be read leaves the row off, and is recorded", async () => {
    mockAutoFolderOutcome = () => {
      throw new Error("database disk image is malformed");
    };

    const { result } = await renderHook(() => useBackup());

    await waitFor(() => expect(mockReportedErrors).toEqual(["backup.auto.read"]));
    expect(result.current.autoFolder).toBeNull();
  });

  test("a failure to turn it off keeps the row honest, surfaced and recorded", async () => {
    mockAutoFolderOutcome = () => "Documents/Bati";
    mockDisableOutcome = () => {
      throw new Error("database is locked");
    };
    const { result } = await renderHook(() => useBackup());
    await waitFor(() => expect(result.current.autoFolder).toBe("Documents/Bati"));

    await act(async () => result.current.runDisableAuto());

    // The folder is still remembered, so the row must still say so — clearing the label on a
    // failed write would be the invisible state with the sign flipped.
    expect(result.current.autoFolder).toBe("Documents/Bati");
    expect(mockShownErrors).toEqual(["backup.exportFailed"]);
    expect(mockReportedErrors).toEqual(["backup.auto.disable"]);
  });

  test("turning it off empties the row it filled", async () => {
    mockAutoFolderOutcome = () => "Documents/Bati";
    const { result } = await renderHook(() => useBackup());
    await waitFor(() => expect(result.current.autoFolder).toBe("Documents/Bati"));

    await act(async () => result.current.runDisableAuto());

    expect(mockCalls).toEqual(["disable"]);
    expect(result.current.autoFolder).toBeNull();
    expect(mockShownSuccesses).toEqual(["backup.autoOffDone"]);
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
