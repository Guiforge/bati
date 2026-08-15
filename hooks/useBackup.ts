import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

import { useToast } from "@/components/common/Toast";
import { validateBackup } from "@/db/backup";
import {
  discardStagedImport,
  exportBackup,
  stageBackupForImport,
  takeSafetyCopy,
} from "@/src/backupFiles";
import { reportError } from "@/src/reportError";
import { useRestoreStore } from "@/stores/restore";

/**
 * The two buttons' worth of orchestration, shared by Settings and onboarding.
 *
 * Nothing destructive happens here. The staged file is validated and the safety copy is taken,
 * and only then does this hand over to DatabaseProvider by moving the store to `restoring` —
 * so the swap always happens after the tree is gone. See src/backupFiles.ts `commitRestore`.
 */
export function useBackup() {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const beginRestore = useRestoreStore((state) => state.beginRestore);
  const [busy, setBusy] = useState(false);

  const runExport = useCallback(async () => {
    setBusy(true);
    try {
      await exportBackup();
      showSuccess(t("backup.exportDone"));
    } catch (error) {
      reportError("backup.export", error);
      showError(t("backup.exportFailed"));
    } finally {
      setBusy(false);
    }
  }, [showError, showSuccess, t]);

  const runImport = useCallback(async () => {
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

      await takeSafetyCopy();
      beginRestore();
    } catch (error) {
      reportError("backup.import", error);
      discardStagedImport();
      showError(t("backup.importFailed"));
    } finally {
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
    runImport: useCallback(() => {
      runImport();
    }, [runImport]),
  };
}
