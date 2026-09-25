import type { File } from "expo-file-system";
import { type RefObject, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useToast } from "@/components/common/Toast";
import { type BackupRejection, keepDeviceSettings, validateBackup } from "@/db/backup";
import { useBugReport } from "@/hooks/useBugReport";
import {
  autoBackupFolder,
  backupBeforeRestore,
  disableAutoBackup,
  enableAutoBackup,
} from "@/src/autoBackup";
import {
  decryptStagedImport,
  discardStagedImport,
  exportBackup,
  saveBackupToFolder,
  stageBackupForImport,
  stagePeerForImport,
} from "@/src/backupFiles";
import { reportError } from "@/src/reportError";
import { useRestoreStore } from "@/stores/restore";

/**
 * One backup action at a time, with `busy` up while it runs. A promise chain rather than
 * `try ... finally`, which the React Compiler cannot lower: it skipped the whole hook over it.
 * `onError` never rethrows, so the flags come down on both paths.
 */
async function exclusive(
  running: RefObject<boolean>,
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
  const { alertWithReport } = useBugReport();
  const beginRestore = useRestoreStore((state) => state.beginRestore);
  const [busy, setBusy] = useState(false);
  // The folder automatic backups write into, as a label, or `null` when the feature is off.
  // Held here rather than read at render time so the row reflects a folder just picked — and
  // so a folder `backupBeforeMigrations` had to forget shows as off the next time Settings opens.
  const [autoFolder, setAutoFolder] = useState<string | null>(null);
  // `busy` cannot guard re-entry: two presses in the same frame both read the state as it was
  // before either render. Two imports racing share one staged filename, so the second overwrites
  // the file the first has already validated — and the swap commits something nobody checked.
  const running = useRef(false);
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
   * Decrypts the staged file when it is sealed, then validates it: `"ok"`, `"cancelled"` when the
   * hero gave up on the password, or the reason it was refused. A plain backup, or one this phone
   * already holds the key to, never shows the sheet. A sealed body that fails its tag rejects in
   * the cipher, and is the answer validation gives a damaged plain file: `"corrupt"`.
   */
  const checkStaged = useCallback(
    async (staged: string): Promise<"ok" | "cancelled" | BackupRejection> => {
      const attempt = (secret?: string) =>
        decryptStagedImport(secret).catch((error: unknown) => {
          reportError("backup.decrypt", error);
          return "corrupt" as const;
        });

      let opened = await attempt();
      while (opened === "needsSecret" || opened === "wrongSecret") {
        const secret = await askSecret(opened === "wrongSecret");
        if (secret === null) return "cancelled";
        opened = await attempt(secret);
      }
      if (opened === "corrupt") return "corrupt";

      const check = await validateBackup(staged);
      return check.ok ? "ok" : check.reason;
    },
    [askSecret],
  );

  useEffect(() => {
    // No unmount guard: React stopped warning about a state update on an unmounted component in
    // 18, and the update itself is a no-op. A `cancelled` flag here would be one more branch to
    // keep covered in exchange for nothing.
    autoBackupFolder()
      .then(setAutoFolder)
      .catch((error) => reportError("backup.auto.read", error));
  }, []);

  const runExport = useCallback(
    () =>
      exclusive(
        running,
        setBusy,
        async () => {
          await exportBackup();
          showSuccess(t("backup.exportDone"));
        },
        (error) => {
          reportError("backup.export", error);
          alertWithReport(t("backup.exportFailed"));
        },
      ),
    [alertWithReport, showSuccess, t],
  );

  const runSaveToFolder = useCallback(
    () =>
      exclusive(
        running,
        setBusy,
        async () => {
          // Silence on `false` is deliberate: the hero closed the folder picker themselves, and
          // telling them so is one toast for something they already know.
          if (await saveBackupToFolder()) showSuccess(t("backup.saveDone"));
        },
        (error) => {
          reportError("backup.save", error);
          alertWithReport(t("backup.exportFailed"));
        },
      ),
    [alertWithReport, showSuccess, t],
  );

  const runEnableAuto = useCallback(
    () =>
      exclusive(
        running,
        setBusy,
        async () => {
          const folder = await enableAutoBackup();
          // `null` is the hero closing the picker. Same silence as `runSaveToFolder`, same reason.
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
   * The one road from a staged file to the swap, whichever door staged it: the picker here, or
   * another device's snapshot from sync (`runAdopt`). Nothing destructive happens before
   * `beginRestore`, and the failure paths all discard the staged file.
   */
  const restoreStaged = useCallback(
    (stage: () => Promise<string | null>) =>
      exclusive(
        running,
        setBusy,
        async () => {
          const staged = await stage();
          if (!staged) return;

          const verdict = await checkStaged(staged);
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
          const saved = await backupBeforeRestore().then(
            () => true,
            (error: unknown) => {
              reportError("backup.beforeRestore", error);
              return false;
            },
          );
          if (!saved) {
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
    [alertWithReport, beginRestore, checkStaged, showError, t],
  );

  const runImport = useCallback(() => restoreStaged(stageBackupForImport), [restoreStaged]);

  // Returned as fire-and-forget handlers: both swallow their own failures into a toast, so a
  // caller has nothing to await and nothing to catch. It keeps the press handlers one-liners.
  return {
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
    runSaveToFolder: useCallback(() => {
      runSaveToFolder().catch((e) => reportError("backup.saveToFolder", e));
    }, [runSaveToFolder]),
    runImport: useCallback(() => {
      runImport().catch((e) => reportError("backup.import", e));
    }, [runImport]),
    /** Takes another device's opened snapshot (src/deviceSync.ts) through the same restore. */
    runAdopt: useCallback(
      (plain: File) => {
        restoreStaged(() => stagePeerForImport(plain)).catch((e) => reportError("backup.adopt", e));
      },
      [restoreStaged],
    ),
  };
}
