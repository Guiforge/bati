import type { File } from "expo-file-system";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useToast } from "@/components/common/Toast";
import { useConfirmDialog } from "@/components/common/useConfirmDialog";
import { type BackupRejection, keepDeviceSettings, validateBackup } from "@/db/backup";
import { useBugReport } from "@/hooks/useBugReport";
import {
  autoBackupFolder,
  backupBeforeRestore,
  disableAutoBackup,
  enableAutoBackup,
} from "@/src/autoBackup";
import { encryptionStatus } from "@/src/backupCipher";
import {
  decryptStagedImport,
  discardStagedImport,
  exportBackup,
  saveBackupAs,
  stageBackupForImport,
  stagePeerForImport,
} from "@/src/backupFiles";
import { isLowMemory } from "@/src/lowMemory";
import { reportError } from "@/src/reportError";
import { useRestoreStore } from "@/stores/restore";

/**
 * One backup action at a time, with `busy` up while it runs. A promise chain rather than
 * `try ... finally`, which the React Compiler cannot lower: it skipped the whole hook over it.
 * `onError` never rethrows, so the flags come down on both paths.
 */
async function exclusive(
  running: { current: boolean },
  setBusy: (busy: boolean) => void,
  work: () => Promise<void>,
  onError: (error: unknown) => void,
): Promise<void> {
  if (running.current) return;
  running.current = true;
  setBusy(true);
  await work().catch(onError);
  running.current = false;
  setBusy(false);
}

/**
 * One import at a time *in the app*, not per screen. Settings, onboarding and the sync prompt each
 * mount this hook, and all of them stage into the same file: two runs racing there let the swap
 * commit a file nobody validated. A ref per instance guarded only the instance.
 */
const running = { current: false };

/** A copy step's outcome as a yes or no, its failure reported under `context`. */
const succeeded = (step: Promise<void>, context: string) =>
  step.then(
    () => true,
    (error: unknown) => {
      reportError(context, error);
      return false;
    },
  );

/**
 * The copies a swap may not go ahead without: the automatic backup folder's, and, for a door that
 * has one, its own (taking another device's version first sends this device's to the sync
 * folder). No copy, no swap.
 */
async function copiesKept(beforeSwap?: () => Promise<void>): Promise<boolean> {
  if (!(await succeeded(backupBeforeRestore(), "backup.beforeRestore"))) return false;
  return beforeSwap === undefined || succeeded(beforeSwap(), "backup.beforeSwap");
}

const isWaiting = (result: string) => result === "needsSecret" || result === "wrongSecret";

/**
 * What checking a staged file concluded. `join` is the adoption of the file's key, offered once the
 * restore is certain to go ahead: adopting it earlier changes the vault of a restore that may still
 * be abandoned (the copies it needs cannot be made).
 */
type StagedVerdict = {
  verdict: "ok" | "cancelled" | BackupRejection;
  join?: (options: { asPrimary: boolean }) => Promise<void>;
};

/** What the password sheet shows while an encrypted import waits for the hero. */
export type SecretRequest = { open: boolean; wrong: boolean };

/**
 * The backup rows' worth of orchestration — share, save, restore — shared by Settings and
 * onboarding.
 *
 * Nothing destructive happens here. The staged file is validated, and only then does this hand
 * over to DatabaseProvider by moving the store to `restoring` — so the swap always happens
 * after the tree is gone. See src/backupFiles.ts `commitRestore`, which takes the safety copy
 * as part of the swap rather than ahead of it.
 */
export function useBackup() {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  // A failure here is exactly the kind of report that used to arrive as a screenshot with no
  // cause — so every catch below offers the bug-report mail instead of a dead-end toast.
  const { alertWithReport, dialog: reportDialog } = useBugReport();
  const { ask, dialog: joinDialog } = useConfirmDialog();
  const beginRestore = useRestoreStore((state) => state.beginRestore);
  const [busy, setBusy] = useState(false);
  // The folder automatic backups write into, as a label, or `null` when the feature is off.
  // Held here rather than read at render time so the row reflects a folder just picked — and
  // so a folder `backupBeforeMigrations` had to forget shows as off the next time Settings opens.
  const [autoFolder, setAutoFolder] = useState<string | null>(null);
  // `busy` cannot guard re-entry: two presses in the same frame both read the state as it was
  // before either render. The guard is `running`, at module level, above.
  // An encrypted import pauses on the hero's password. The sheet's answer resolves this; `null`
  // is "cancel". A ref, because the import that is waiting holds the resolver across renders.
  const [secretRequest, setSecretRequest] = useState<SecretRequest>({ open: false, wrong: false });
  const answerSecret = useRef<((secret: string | null) => void) | null>(null);

  const askSecret = useCallback(
    (wrong: boolean) =>
      new Promise<string | null>((resolve) => {
        answerSecret.current = resolve;
        setSecretRequest({ open: true, wrong });
      }),
    [],
  );

  const settleSecret = useCallback((secret: string | null) => {
    setSecretRequest({ open: false, wrong: false });
    answerSecret.current?.(secret);
    answerSecret.current = null;
  }, []);

  /**
   * A backup just opened with its password, under a key this phone did not hold. With encryption
   * on here, the key is only remembered, so that file opens again without asking. Otherwise the
   * hero is asked whether their own backups should use that password from now on: yes on a new
   * phone restoring their own history, and never silently, since a file someone else handed over
   * would otherwise make every later backup open with the giver's secret.
   */
  // The native Alert outlived its screen; this dialog dies with it. Unmounted with the question
  // open, the answer is "Not now": a pending one would hold `running`, and every backup action
  // after it would be ignored until a restart. Here, not in useConfirmDialog: other callers'
  // cancel records a decision (SyncPrompt's "keep"), which an unmount must not make for the hero.
  const declineJoin = useRef<(() => void) | null>(null);
  useEffect(() => () => declineJoin.current?.(), []);

  const offerJoin = useCallback(
    async (join: (options: { asPrimary: boolean }) => Promise<void>) => {
      if ((await encryptionStatus()) === "on") {
        await join({ asPrimary: false });
        return;
      }
      const accepted = await new Promise<boolean>((resolve) => {
        declineJoin.current = () => resolve(false);
        ask({
          title: t("backup.joinTitle"),
          body: t("backup.joinBody"),
          confirmLabel: t("backup.joinYes"),
          cancelLabel: t("backup.joinNo"),
          onConfirm: () => resolve(true),
          // Hardware back is this too: the key is not adopted, and the restore goes ahead.
          onCancel: () => resolve(false),
        });
      });
      if (accepted) await join({ asPrimary: true });
    },
    [ask, t],
  );

  /**
   * Decrypts the staged file when it is sealed, then validates it: `"ok"`, `"cancelled"` when the
   * hero gave up on the password, or the reason it was refused. A plain backup, or one this phone
   * already holds the key to, never shows the sheet. A sealed body that fails its tag rejects in
   * the cipher, and is the answer validation gives a damaged plain file: `"corrupt"`.
   */
  // The restore stops, with the one sentence that says what to do, and without calling the file
  // damaged: it is not.
  const lowMemoryStop = useCallback(() => {
    showError(t("backup.lowMemory"));
    return "cancelled" as const;
  }, [showError, t]);

  const checkStaged = useCallback(
    async (staged: string): Promise<StagedVerdict> => {
      const attempt = (secret?: string) =>
        decryptStagedImport(secret).catch((error: unknown) => {
          reportError("backup.decrypt", error);
          // Not a damaged file when this phone could not afford the key derivation: said as that.
          return isLowMemory(error)
            ? ({ result: "lowMemory" } as const)
            : ({ result: "corrupt" } as const);
        });

      let opened = await attempt();
      if (opened.result === "newerVersion") return { verdict: "newerVersion" };
      while (isWaiting(opened.result)) {
        const secret = await askSecret(opened.result === "wrongSecret");
        if (secret === null) return { verdict: "cancelled" };
        opened = await attempt(secret);
      }
      if (opened.result === "lowMemory") return { verdict: lowMemoryStop() };
      if (opened.result === "corrupt") return { verdict: "corrupt" };

      const check = await validateBackup(staged);
      if (!check.ok) return { verdict: check.reason };
      // Offered later, by the caller, once the copies are kept: adopting the key now would change
      // the vault of a restore that may still be abandoned.
      return { verdict: "ok", join: opened.join };
    },
    [askSecret, lowMemoryStop],
  );

  useEffect(() => {
    // No unmount guard: React stopped warning about a state update on an unmounted component in
    // 18, and the update itself is a no-op. A `cancelled` flag here would be one more branch to
    // keep covered in exchange for nothing.
    autoBackupFolder()
      .then(setAutoFolder)
      .catch((error) => reportError("backup.auto.read", error));
  }, []);

  // A locked vault (a new phone whose key did not follow) refuses to write, and that is not a
  // fault to report: the way out is the password, so the toast says so.
  const writeFailed = useCallback(
    (context: string, error: unknown) => {
      if (error instanceof Error && error.message.includes("Encryption is locked")) {
        showError(t("backup.lockedFirst"));
        return;
      }
      reportError(context, error);
      alertWithReport(t("backup.exportFailed"));
    },
    [alertWithReport, showError, t],
  );

  const runExport = useCallback(
    () =>
      exclusive(
        running,
        setBusy,
        async () => {
          await exportBackup();
          showSuccess(t("backup.exportDone"));
        },
        (error) => writeFailed("backup.export", error),
      ),
    [showSuccess, t, writeFailed],
  );

  const runSaveAs = useCallback(
    () =>
      exclusive(
        running,
        setBusy,
        async () => {
          const saved = await saveBackupAs();
          // Silence on `null` is deliberate: the hero backed out of Android's screen themselves,
          // and telling them so is one toast for something they already know.
          if (saved === null) return;
          // A device with nothing to save a file with: the share sheet is the way left.
          if (saved === "noPicker") {
            await exportBackup();
            showSuccess(t("backup.exportDone"));
            return;
          }
          showSuccess(t("backup.savedAs", { name: saved.name }));
        },
        (error) => writeFailed("backup.save", error),
      ),
    [showSuccess, t, writeFailed],
  );

  const runEnableAuto = useCallback(
    () =>
      exclusive(
        running,
        setBusy,
        async () => {
          const folder = await enableAutoBackup();
          // `null` is the hero closing the picker. Same silence as `runSaveAs`, same reason.
          if (folder !== null) {
            setAutoFolder(folder);
            showSuccess(t("backup.autoOnDone", { folder }));
          }
        },
        (error) => {
          reportError("backup.auto.enable", error);
          // The folder is only remembered after the first write succeeds, so a failure here leaves
          // the feature exactly as off as the row still says it is.
          alertWithReport(t("backup.exportFailed"));
        },
      ),
    [alertWithReport, showSuccess, t],
  );

  const runDisableAuto = useCallback(
    () =>
      exclusive(
        running,
        setBusy,
        async () => {
          await disableAutoBackup();
          setAutoFolder(null);
          showSuccess(t("backup.autoOffDone"));
        },
        (error) => {
          reportError("backup.auto.disable", error);
          alertWithReport(t("backup.exportFailed"));
        },
      ),
    [alertWithReport, showSuccess, t],
  );

  /**
   * The copies first, the key second: a restore abandoned for want of a copy leaves this device's
   * vault exactly as it was. False when a copy could not be made.
   */
  const keepCopiesThenJoin = useCallback(
    async (join: StagedVerdict["join"], beforeSwap?: () => Promise<void>) => {
      if (!(await copiesKept(beforeSwap))) return false;
      if (join) await offerJoin(join);
      return true;
    },
    [offerJoin],
  );

  /**
   * The one road from a staged file to the swap, whichever door staged it: the picker here, or
   * another device's snapshot from sync (`runAdopt`). Nothing destructive happens before
   * `beginRestore`, and the failure paths all discard the staged file.
   */
  const restoreStaged = useCallback(
    (stage: () => Promise<string | null>, beforeSwap?: () => Promise<void>) =>
      exclusive(
        running,
        setBusy,
        async () => {
          const staged = await stage();
          if (!staged) return;

          const { verdict, join } = await checkStaged(staged);
          if (verdict !== "ok") {
            discardStagedImport();
            // Silence on a cancel, same reason as the picker: the hero closed it themselves.
            if (verdict !== "cancelled") showError(t(`backup.rejected.${verdict}`));
            return;
          }

          // The backup brings the hero; this device keeps its own folder, id and crash log.
          await keepDeviceSettings(staged);

          // Last, so a file that will be refused never costs a snapshot; before `beginRestore`,
          // because after it the tree is gone and the database closes.
          if (!(await keepCopiesThenJoin(join, beforeSwap))) {
            discardStagedImport();
            alertWithReport(t("backup.beforeRestoreFailed"));
            return;
          }

          beginRestore();
        },
        (error) => {
          reportError("backup.import", error);
          discardStagedImport();
          alertWithReport(t("backup.importFailed"));
        },
      ),
    [alertWithReport, beginRestore, checkStaged, keepCopiesThenJoin, showError, t],
  );

  const runImport = useCallback(() => restoreStaged(stageBackupForImport), [restoreStaged]);

  // Returned as fire-and-forget handlers: both swallow their own failures into a toast, so a
  // caller has nothing to await and nothing to catch. It keeps the press handlers one-liners.
  return {
    // The failure alert and the join question: every caller renders it once.
    dialog: (
      <>
        {reportDialog}
        {joinDialog}
      </>
    ),
    busy,
    autoFolder,
    secretRequest,
    submitSecret: settleSecret,
    cancelSecret: useCallback(() => settleSecret(null), [settleSecret]),
    runExport: useCallback(() => {
      runExport().catch((e) => reportError("backup.export", e));
    }, [runExport]),
    runEnableAuto: useCallback(() => {
      runEnableAuto().catch((e) => reportError("backup.auto.enable", e));
    }, [runEnableAuto]),
    runDisableAuto: useCallback(() => {
      runDisableAuto().catch((e) => reportError("backup.auto.disable", e));
    }, [runDisableAuto]),
    runSaveAs: useCallback(() => {
      runSaveAs().catch((e) => reportError("backup.save", e));
    }, [runSaveAs]),
    runImport: useCallback(() => {
      runImport().catch((e) => reportError("backup.import", e));
    }, [runImport]),
    /**
     * Takes another device's opened snapshot (src/deviceSync.ts) through the same restore, after
     * `beforeSwap` kept a copy of this device's history where the hero can reach it.
     */
    runAdopt: useCallback(
      (plain: File, beforeSwap: () => Promise<void>) => {
        restoreStaged(() => stagePeerForImport(plain), beforeSwap).catch((e) =>
          reportError("backup.adopt", e),
        );
      },
      [restoreStaged],
    ),
  };
}
