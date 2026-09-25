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
let mockDecryptOutcomes: string[] = [];
let mockEncryption = "off";
let mockAlertAnswer = "backup.joinNo";
const mockSystemAlerts: string[] = [];

jest.mock("@/src/backupCipher", () => ({
  encryptionStatus: () => Promise.resolve(mockEncryption),
}));

// The join question is a system alert: answered here by the button whose text is `mockAlertAnswer`.
jest.mock("react-native", () => {
  const rn = jest.requireActual("react-native");
  rn.Alert.alert = (
    title: string,
    _message: string,
    buttons: { text: string; onPress?: () => void }[],
  ) => {
    mockSystemAlerts.push(title);
    buttons.find((b) => b.text === mockAlertAnswer)?.onPress?.();
  };
  return rn;
});

jest.mock("@/db/backup", () => ({
  validateBackup: jest.fn(async () => {
    mockCalls.push("validate");
    await Promise.resolve();
    mockValidateBehaviour();
    return mockValidation;
  }),
  keepDeviceSettings: jest.fn(async () => {
    mockCalls.push("keepDevice");
    await Promise.resolve();
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
  stagePeerForImport: jest.fn(async () => {
    mockCalls.push("stagePeer");
    await Promise.resolve();
    return "/tmp/staged.db";
  }),
  // One outcome per call, in order; a plain backup when the list runs out.
  decryptStagedImport: jest.fn(async (secret?: string) => {
    mockCalls.push(secret === undefined ? "decrypt" : `decrypt:${secret}`);
    await Promise.resolve();
    const outcome = mockDecryptOutcomes.shift() ?? "notEncrypted";
    if (outcome === "throw") throw new Error("Unsupported state or unable to authenticate data");
    if (outcome === "openedWithSecret") {
      return {
        result: "opened",
        join: ({ asPrimary }: { asPrimary: boolean }) =>
          Promise.resolve().then(() => {
            mockCalls.push(`join:${asPrimary ? "primary" : "keyring"}`);
          }),
      };
    }
    return { result: outcome };
  }),
  // biome-ignore lint/suspicious/useAwait: mirrors the real Promise-returning signature
  saveBackupToFolder: jest.fn(async () => {
    mockCalls.push("save");
    return mockSaveOutcome();
  }),
}));

let mockAutoFolderOutcome: () => string | null = () => null;
let mockEnableOutcome: () => string | null = () => "Documents/Bati";
let mockDisableOutcome: () => void = () => {};
let mockBeforeRestoreOutcome: () => void = () => {};

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
  backupBeforeRestore: jest.fn(async () => {
    await Promise.resolve();
    mockCalls.push("beforeRestore");
    mockBeforeRestoreOutcome();
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

// Failures are offered as an alert with a "send me the details" button, not a toast — the two
// are recorded apart so a test cannot pass with the report action wired to the wrong surface.
const mockAlerts: string[] = [];
jest.mock("@/hooks/useBugReport", () => ({
  useBugReport: () => ({
    alertWithReport: (message: string) => mockAlerts.push(message),
    openBugReport: jest.fn(),
    crashCount: 0,
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
  mockAlerts.length = 0;
  mockReportedErrors.length = 0;
  mockStagedPath = "/tmp/staged.db";
  mockValidation = { ok: true };
  mockExportBehaviour = () => {};
  mockValidateBehaviour = () => {};
  mockStageGate = null;
  mockSaveOutcome = () => true;
  mockDecryptOutcomes = [];
  mockEncryption = "off";
  mockAlertAnswer = "backup.joinNo";
  mockSystemAlerts.length = 0;
  mockAutoFolderOutcome = () => null;
  mockEnableOutcome = () => "Documents/Bati";
  mockDisableOutcome = () => {};
  mockBeforeRestoreOutcome = () => {};
  useRestoreStore.setState({ phase: "idle" });
});

describe("useBackup — encrypted import", () => {
  test("asks for the password, retries on a wrong one, and validates only what it opened", async () => {
    mockDecryptOutcomes = ["needsSecret", "wrongSecret", "opened"];
    const { result } = await renderHook(() => useBackup());

    await act(() => result.current.runImport());
    await waitFor(() => expect(result.current.secretRequest).toEqual({ open: true, wrong: false }));

    await act(async () => result.current.submitSecret("typo"));
    await waitFor(() => expect(result.current.secretRequest).toEqual({ open: true, wrong: true }));

    await act(async () => result.current.submitSecret("correct horse"));
    await waitFor(() => expect(useRestoreStore.getState().phase).toBe("restoring"));

    expect(mockCalls).toEqual([
      "stage",
      "decrypt",
      "decrypt:typo",
      "decrypt:correct horse",
      "validate",
      "keepDevice",
      "beforeRestore",
    ]);
    expect(result.current.secretRequest.open).toBe(false);
  });

  test("cancelling the password discards the file and restores nothing", async () => {
    mockDecryptOutcomes = ["needsSecret"];
    const { result } = await renderHook(() => useBackup());

    await act(() => result.current.runImport());
    await waitFor(() => expect(result.current.secretRequest.open).toBe(true));
    await act(async () => result.current.cancelSecret());

    await waitFor(() => expect(mockCalls).toEqual(["stage", "decrypt", "discard"]));
    expect(useRestoreStore.getState().phase).toBe("idle");
    expect(mockAlerts).toEqual([]);
  });
});

test("an encrypted file that fails to authenticate is reported as damaged", async () => {
  mockDecryptOutcomes = ["throw"];
  const { result } = await renderHook(() => useBackup());

  await act(async () => result.current.runImport());

  expect(mockCalls).toEqual(["stage", "decrypt", "discard"]);
  expect(mockShownErrors).toEqual(["backup.rejected.corrupt"]);
  expect(mockReportedErrors).toEqual(["backup.decrypt"]);
});

test("taking another device's snapshot walks the same road as a restore", async () => {
  const { result } = await renderHook(() => useBackup());

  const keepCopy = () =>
    Promise.resolve().then(() => {
      mockCalls.push("keepCopy");
    });
  await act(() => result.current.runAdopt({ uri: "file:///db/peer.plain" } as never, keepCopy));

  await waitFor(() => expect(useRestoreStore.getState().phase).toBe("restoring"));
  expect(mockCalls).toEqual([
    "stagePeer",
    "decrypt",
    "validate",
    "keepDevice",
    "beforeRestore",
    "keepCopy",
  ]);
});

test("no copy of this device's history on the server, no take", async () => {
  const { result } = await renderHook(() => useBackup());

  await act(() =>
    result.current.runAdopt({ uri: "file:///db/peer.plain" } as never, () =>
      Promise.reject(new Error("offline")),
    ),
  );

  await waitFor(() => expect(mockCalls).toContain("discard"));
  expect(useRestoreStore.getState().phase).toBe("idle");
  expect(mockAlerts).toEqual(["backup.beforeRestoreFailed"]);
});

test("two screens cannot run two imports into the one staging file", async () => {
  let openPicker: () => void = () => {};
  mockStageGate = new Promise<void>((resolve) => {
    openPicker = resolve;
  });
  const settings = await renderHook(() => useBackup());
  const prompt = await renderHook(() => useBackup());

  await act(async () => {
    settings.result.current.runImport();
    prompt.result.current.runAdopt({ uri: "file:///db/peer.plain" } as never, () =>
      Promise.resolve(),
    );
    openPicker();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  expect(mockCalls.filter((c) => c === "stage" || c === "stagePeer")).toEqual(["stage"]);
});

describe("an encrypted backup opened with its password", () => {
  test("with encryption off here, the hero is asked before the key becomes this phone's", async () => {
    mockDecryptOutcomes = ["needsSecret", "openedWithSecret"];
    mockAlertAnswer = "backup.joinYes";
    const { result } = await renderHook(() => useBackup());

    await act(() => result.current.runImport());
    await waitFor(() => expect(result.current.secretRequest.open).toBe(true));
    await act(async () => result.current.submitSecret("correct horse"));
    await waitFor(() => expect(useRestoreStore.getState().phase).toBe("restoring"));

    expect(mockSystemAlerts).toEqual(["backup.joinTitle"]);
    expect(mockCalls).toContain("join:primary");
  });

  test("declined, nothing is adopted and the restore still goes ahead", async () => {
    mockDecryptOutcomes = ["needsSecret", "openedWithSecret"];
    mockAlertAnswer = "backup.joinNo";
    const { result } = await renderHook(() => useBackup());

    await act(() => result.current.runImport());
    await waitFor(() => expect(result.current.secretRequest.open).toBe(true));
    await act(async () => result.current.submitSecret("correct horse"));
    await waitFor(() => expect(useRestoreStore.getState().phase).toBe("restoring"));

    expect(mockCalls.some((c) => c.startsWith("join:"))).toBe(false);
  });

  test("with encryption on here, the key is only remembered, without a question", async () => {
    mockEncryption = "on";
    mockDecryptOutcomes = ["needsSecret", "openedWithSecret"];
    const { result } = await renderHook(() => useBackup());

    await act(() => result.current.runImport());
    await waitFor(() => expect(result.current.secretRequest.open).toBe(true));
    await act(async () => result.current.submitSecret("correct horse"));
    await waitFor(() => expect(useRestoreStore.getState().phase).toBe("restoring"));

    expect(mockSystemAlerts).toEqual([]);
    expect(mockCalls).toContain("join:keyring");
  });
});

describe("useBackup — import", () => {
  test("validates, then copies the current data aside, before handing over to the swap", async () => {
    const { result } = await renderHook(() => useBackup());

    await act(async () => result.current.runImport());

    expect(mockCalls).toEqual(["stage", "decrypt", "validate", "keepDevice", "beforeRestore"]);
    expect(useRestoreStore.getState().phase).toBe("restoring");
  });

  test("a copy that fails abandons the restore: the hero's data is never replaced without it", async () => {
    mockBeforeRestoreOutcome = () => {
      throw new Error("no space left on device");
    };
    const { result } = await renderHook(() => useBackup());

    await act(async () => result.current.runImport());

    expect(mockCalls).toEqual([
      "stage",
      "decrypt",
      "validate",
      "keepDevice",
      "beforeRestore",
      "discard",
    ]);
    expect(useRestoreStore.getState().phase).toBe("idle");
    // Its own message: "that file could not be read" would blame a backup that was fine.
    expect(mockAlerts).toEqual(["backup.beforeRestoreFailed"]);
    expect(mockReportedErrors).toEqual(["backup.beforeRestore"]);
  });

  test("a rejected backup is discarded, and the app is never handed over", async () => {
    mockValidation = { ok: false, reason: "notBati" };
    const { result } = await renderHook(() => useBackup());

    await act(async () => result.current.runImport());

    expect(mockCalls).toEqual(["stage", "decrypt", "validate", "discard"]);
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

    expect(mockCalls).toEqual(["stage", "decrypt", "validate", "keepDevice", "beforeRestore"]);
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

    expect(mockCalls).toEqual(["stage", "decrypt", "validate", "discard"]);
    expect(useRestoreStore.getState().phase).toBe("idle");
    expect(mockAlerts).toEqual(["backup.importFailed"]);
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
    expect(mockAlerts).toEqual([]);
    expect(mockReportedErrors).toEqual([]);
  });

  test("a real failure is surfaced with the report offer and recorded, never swallowed", async () => {
    mockSaveOutcome = () => {
      throw new Error("no space left on device");
    };
    const { result } = await renderHook(() => useBackup());

    await act(async () => result.current.runSaveToFolder());

    expect(mockAlerts).toEqual(["backup.exportFailed"]);
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
    expect(mockAlerts).toEqual([]);
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
    expect(mockAlerts).toEqual(["backup.exportFailed"]);
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
    expect(mockAlerts).toEqual(["backup.exportFailed"]);
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

    expect(mockAlerts).toEqual(["backup.exportFailed"]);
    expect(mockReportedErrors).toEqual(["backup.export"]);
  });
});
