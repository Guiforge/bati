import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useToast } from "@/components/common/Toast";
import {
  canShowRecoveryKeyAgain,
  changePassword,
  disableEncryption,
  type EncryptionStatus,
  enableEncryption,
  encryptionStatus,
  readRecoveryKey,
} from "@/src/backupCipher";
import { reportError } from "@/src/reportError";

/** Shortest password the setup accepts. PBKDF2 slows guessing; it cannot rescue "1234". */
export const MIN_PASSWORD_LENGTH = 8;

/**
 * Settings' half of encrypted backups: the status the row shows, and the four things the hero
 * can do to it. Every call reports its own failure and never throws, like `useBackup`.
 */
export function useBackupEncryption() {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const [status, setStatus] = useState<EncryptionStatus>("off");

  const refresh = useCallback(() => {
    encryptionStatus()
      .then(setStatus)
      .catch((error) => reportError("backup.encryption.read", error));
  }, []);

  useEffect(refresh, [refresh]);

  /** The formatted recovery key to show once, or `null` when setting up failed. */
  const enable = useCallback(
    (password: string) =>
      enableEncryption(password).then(
        (recovery) => {
          setStatus("on");
          return recovery;
        },
        (error: unknown) => {
          reportError("backup.encryption.enable", error);
          showError(t("backup.encryptionFailed"));
          return null;
        },
      ),
    [showError, t],
  );

  const change = useCallback(
    (password: string) =>
      changePassword(password).then(
        () => showSuccess(t("backup.passwordChanged")),
        (error: unknown) => {
          reportError("backup.encryption.change", error);
          showError(t("backup.encryptionFailed"));
        },
      ),
    [showError, showSuccess, t],
  );

  const disable = useCallback(
    () =>
      disableEncryption().then(
        () => {
          setStatus("off");
          showSuccess(t("backup.encryptionOffDone"));
        },
        (error: unknown) => reportError("backup.encryption.disable", error),
      ),
    [showSuccess, t],
  );

  /**
   * Behind the fingerprint. A dismissed prompt rejects, and that is the hero changing their mind,
   * not a failure: it is reported for the trail and says nothing.
   */
  const recovery = useCallback(
    () =>
      readRecoveryKey().catch((error: unknown) => {
        reportError("backup.encryption.recovery", error);
        return null;
      }),
    [],
  );

  return {
    status,
    refresh,
    enable,
    change,
    disable,
    recovery,
    canShowRecoveryAgain: canShowRecoveryKeyAgain(),
  };
}
