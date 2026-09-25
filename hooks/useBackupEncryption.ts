import { useEffect, useState } from "react";
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
 * Settings' half of encrypted backups: the status the row shows, and what the hero can do to it.
 * Every call reports its own failure and never throws, like `useBackup`. No `useCallback`: the
 * React Compiler memoises what this returns (docs/architecture/performance.md).
 */
export function useBackupEncryption() {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const [status, setStatus] = useState<EncryptionStatus>("off");

  const refresh = () => {
    encryptionStatus()
      .then(setStatus)
      .catch((error) => reportError("backup.encryption.read", error));
  };

  useEffect(refresh, []);

  /** Runs a key-making call; the recovery key to show, or `null` after saying it failed. */
  const makeKey = (make: Promise<string>, context: string) =>
    make.then(
      (recovery) => {
        setStatus("on");
        return recovery;
      },
      (error: unknown) => {
        reportError(context, error);
        showError(t("backup.encryptionFailed"));
        return null;
      },
    );

  return {
    status,
    refresh,
    enable: (password: string) => makeKey(enableEncryption(password), "backup.encryption.enable"),
    change: (password: string) => makeKey(changePassword(password), "backup.encryption.change"),
    disable: () =>
      disableEncryption().then(
        () => {
          setStatus("off");
          showSuccess(t("backup.encryptionOffDone"));
        },
        (error: unknown) => reportError("backup.encryption.disable", error),
      ),
    /**
     * Behind the fingerprint. A dismissed prompt rejects, and that is the hero changing their
     * mind, not a failure: it is reported for the trail and says nothing.
     */
    recovery: () =>
      readRecoveryKey().catch((error: unknown) => {
        reportError("backup.encryption.recovery", error);
        return null;
      }),
    canShowRecoveryAgain: canShowRecoveryKeyAgain(),
  };
}
