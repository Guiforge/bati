import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useToast } from "@/components/common/Toast";
import { validateBackup } from "@/db/backup";
import {
  discardStagedImport,
  exportBackup,
  saveBackupToFolder,
  stageBackupForImport,
} from "@/src/backupFiles";
import { reportError } from "@/src/reportError";
import { useRestoreStore } from "@/stores/restore";

/**
 * The two buttons' worth of orchestration, shared by Settings and onboarding.
 *
 * Nothing destructive happens here. The staged file is validated, and only then does this hand
 * over to DatabaseProvider by moving the store to `restoring` — so the swap always happens
 * after the tree is gone. See src/backupFiles.ts `commitRestore`, which takes the safety copy
 * as part of the swap rather than ahead of it.
 */
export function useBackup() {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const beginRestore = useRestoreStore((state) => state.beginRestore);
  const [busy, setBusy] = useState(false);
  // `busy` cannot guard re-entry: two presses in the same frame both read the state as it was
  // before either render. Two imports racing share one staged filename, so the second overwrites
  // the file the first has already validated — and the swap commits something nobody checked.
  const running = useRef(false);

  const runExport = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    try {
      await exportBackup();
      showSuccess(t("backup.exportDone"));
    } catch (error) {
      reportError("backup.export", error);
      showError(t("backup.exportFailed"));
    } finally {
      running.current = false;
      setBusy(false);
    }
  }, [showError, showSuccess, t]);

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
      showError(t("backup.exportFailed"));
    } finally {
      running.current = false;
      setBusy(false);
    }
  }, [showError, showSuccess, t]);

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
      showError(t("backup.importFailed"));
    } finally {
      running.current = false;
      setBusy(false);
    }
  }, [beginRestore, showError, t]);

  // Returned as fire-and-forget handlers: both swallow their own failures into a toast, so a
  // caller has nothing to await and nothing to catch. It keeps the press handlers one-liners.
  return {
    busy,
    runExport: useCallback(() => {
      runExport();
    }, [runExport]),
    runSaveToFolder: useCallback(() => {
      runSaveToFolder();
    }, [runSaveToFolder]),
    runImport: useCallback(() => {
      runImport();
    }, [runImport]),
  };
}
