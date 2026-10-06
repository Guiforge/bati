import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useToast } from "@/components/common/Toast";
import {
  canShowRecoveryKeyAgain,
  changePassword,
  checkPassword,
  confirmWords,
  disableEncryption,
  type EncryptionStatus,
  enableEncryption,
  encryptionStatus,
  readRecoveryKey,
  rewrapPassword,
  rewrapWords,
  vaultFormat,
  wordsPending,
} from "@/src/backupCipher";
import { wordLanguageFor } from "@/src/backupWords";
import { syncAccount, vaultUpdateBlockers } from "@/src/deviceSync";
import { isLowMemory } from "@/src/lowMemory";
import {
  passwordRemindersOn,
  restartPasswordChecks,
  setPasswordReminders,
} from "@/src/passwordReminders";
import { reportError } from "@/src/reportError";
import { type UnlockResult, type UnlockSource, unlockSources, unlockWith } from "@/src/vaultUnlock";
import { vaultUpdateOffered } from "@/src/vaultUpdateDelay";

/**
 * Settings' half of encrypted backups: the status the row shows, and what the hero can do to it.
 * Every call reports its own failure and never throws, like `useBackup`. No `useCallback`: the
 * React Compiler memoises what this returns (docs/architecture/performance.md).
 */
export function useBackupEncryption() {
  const { t, i18n } = useTranslation();
  const { showSuccess, showError } = useToast();
  const [status, setStatus] = useState<EncryptionStatus>("off");
  const [format, setFormat] = useState<2 | 3 | null>(null);
  const [toCheck, setToCheck] = useState(false);
  const [updateOffered, setUpdateOffered] = useState(false);
  const [canShowRecoveryAgain, setCanShowRecoveryAgain] = useState(false);
  const language = wordLanguageFor(i18n.language);

  const refresh = () => {
    Promise.all([
      encryptionStatus(),
      vaultFormat(),
      wordsPending(),
      canShowRecoveryKeyAgain(),
      vaultUpdateOffered(),
    ])
      .then(([next, nextFormat, pending, canShow, offered]) => {
        setStatus(next);
        setFormat(nextFormat);
        setToCheck(pending);
        setCanShowRecoveryAgain(canShow);
        setUpdateOffered(offered);
      })
      .catch((error) => reportError("backup.encryption.read", error));
  };

  useEffect(refresh, []);

  /**
   * Runs a call that ends with twelve words to show; the words, or `null` after saying it failed.
   * A new key is the one to practise, so the password check starts again from its first step.
   */
  const makeWords = (make: Promise<string>, context: string) =>
    make.then(
      async (words) => {
        refresh();
        await restartPasswordChecks();
        return words;
      },
      (error: unknown) => {
        reportError(context, error);
        showError(t(isLowMemory(error) ? "backup.lowMemory" : "backup.encryptionFailed"));
        return null;
      },
    );

  return {
    status,
    /** 2 for a vault from an older build, which the hero can update; 3 for the current one. */
    format,
    /**
     * Whether a format 2 vault may be offered the update yet. Hidden for the first 14 days of this
     * version (`src/vaultUpdateDelay.ts`), so a second phone still on 2.9 can keep reading.
     */
    updateOffered,
    /** The twelve words were made and not yet typed back: an abandoned setup says so, once. */
    wordsToCheck: toCheck,
    refresh,
    enable: (password: string) =>
      makeWords(enableEncryption(password, language), "backup.encryption.enable"),
    /** A new key, and with it new words: for a hero who thinks the password was seen, or the update. */
    change: (password: string) =>
      makeWords(changePassword(password, language), "backup.encryption.change"),
    /** "I don't remember it": a new password on the same key. `true` when it was saved. */
    forgot: (password: string) =>
      rewrapPassword(password).then(
        async () => {
          refresh();
          await restartPasswordChecks();
          return true;
        },
        (error: unknown) => {
          reportError("backup.encryption.forgot", error);
          showError(t(isLowMemory(error) ? "backup.lowMemory" : "backup.encryptionFailed"));
          return false;
        },
      ),
    newWords: () => makeWords(rewrapWords(language), "backup.encryption.newWords"),
    /** The answer to "ask me again from time to time", given when a password has just been set. */
    // "No thanks" declines being asked, it does not cancel reminders the hero already turned on
    // (the done screen also ends "I don't remember it", where the Home card is what asked).
    remind: (on: boolean) =>
      (on ? Promise.resolve(false) : passwordRemindersOn())
        .then((alreadyOn) => (alreadyOn ? undefined : setPasswordReminders(on)))
        .catch((error: unknown) => reportError("backup.encryption.remind", error)),
    /** Whether the password the hero types is the one of this phone's vault. */
    checkPassword: (password: string) => checkPassword(password),
    /** The words were typed back correctly. */
    wordsChecked: () =>
      confirmWords().then(refresh, (error: unknown) =>
        reportError("backup.encryption.confirm", error),
      ),
    /**
     * Whether something stops the update of the vault: a device of this hero still waiting for a
     * password. With no sync there is nothing to wait for. A failing sync is not a blocker: the
     * hero is told, and the update goes ahead on what is known.
     */
    updateBlocked: async () => {
      try {
        if ((await syncAccount()) === null) return false;
        return (await vaultUpdateBlockers()).length > 0;
      } catch (error) {
        reportError("backup.encryption.blockers", error);
        return false;
      }
    },
    disable: () =>
      disableEncryption().then(
        () => {
          refresh();
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
    canShowRecoveryAgain,
    /** Which places the hero can read the key from: only those with something behind them. */
    unlockSources,
    /** The password or words, tried against `source`. Opening it makes the key this phone's. */
    unlock: (source: UnlockSource, secret: string): Promise<UnlockResult> =>
      unlockWith(source, secret).then(
        (result) => {
          if (result === "unlocked") refresh();
          return result;
        },
        (error: unknown) => {
          reportError("backup.encryption.unlock", error);
          return "nothingToTry";
        },
      ),
  };
}
