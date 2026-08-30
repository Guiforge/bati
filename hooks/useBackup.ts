import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useToast } from "@/components/common/Toast";
import { validateBackup } from "@/db/backup";
import { useBugReport } from "@/hooks/useBugReport";
import { autoBackupFolder, disableAutoBackup, enableAutoBackup } from "@/src/autoBackup";
import {
  discardStagedImport,
  exportBackup,
  saveBackupToFolder,
  stageBackupForImport,
} from "@/src/backupFiles";
import { reportError } from "@/src/reportError";
import { useRestoreStore } from "@/stores/restore";

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

  useEffect(() => {
    // No unmount guard: React stopped warning about a state update on an unmounted component in
    // 18, and the update itself is a no-op. A `cancelled` flag here would be one more branch to
    // keep covered in exchange for nothing.
    autoBackupFolder()
      .then(setAutoFolder)
      .catch((error) => reportError("backup.auto.read", error));
  }, []);

  const runExport = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    try {
      await exportBackup();
      showSuccess(t("backup.exportDone"));
    } catch (error) {
      reportError("backup.export", error);
      alertWithReport(t("backup.exportFailed"));
    } finally {
      running.current = false;
      setBusy(false);
    }
  }, [alertWithReport, showSuccess, t]);

  const runSaveToFolder = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    try {
      // Silence on `false` is deliberate: the hero closed the folder picker themselves, and
      // telling them so is one toast for something they already know.
      if (await saveBackupToFolder()) showSuccess(t("backup.saveDone"));
    } catch (error) {
      reportError("backup.save", error);
      alertWithReport(t("backup.exportFailed"));
    } finally {
      running.current = false;
      setBusy(false);
    }
  }, [alertWithReport, showSuccess, t]);

  const runEnableAuto = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    try {
      const folder = await enableAutoBackup();
      // `null` is the hero closing the picker. Same silence as `runSaveToFolder`, same reason.
      if (folder !== null) {
        setAutoFolder(folder);
        showSuccess(t("backup.autoOnDone", { folder }));
      }
    } catch (error) {
      reportError("backup.auto.enable", error);
      // The folder is only remembered after the first write succeeds, so a failure here leaves
      // the feature exactly as off as the row still says it is.
      alertWithReport(t("backup.exportFailed"));
    } finally {
      running.current = false;
      setBusy(false);
    }
  }, [alertWithReport, showSuccess, t]);

  const runDisableAuto = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    try {
      await disableAutoBackup();
      setAutoFolder(null);
      showSuccess(t("backup.autoOffDone"));
    } catch (error) {
      reportError("backup.auto.disable", error);
      alertWithReport(t("backup.exportFailed"));
    } finally {
      running.current = false;
      setBusy(false);
    }
  }, [alertWithReport, showSuccess, t]);

  const runImport = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    try {
      const staged = await stageBackupForImport();
      if (!staged) return;

      const check = await validateBackup(staged);
      if (!check.ok) {
        discardStagedImport();
        showError(t(`backup.rejected.${check.reason}`));
        return;
      }

      beginRestore();
    } catch (error) {
      reportError("backup.import", error);
      discardStagedImport();
      alertWithReport(t("backup.importFailed"));
    } finally {
      running.current = false;
      setBusy(false);
    }
  }, [alertWithReport, beginRestore, showError, t]);

  // Returned as fire-and-forget handlers: both swallow their own failures into a toast, so a
  // caller has nothing to await and nothing to catch. It keeps the press handlers one-liners.
  return {
    busy,
    autoFolder,
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
  };
}
