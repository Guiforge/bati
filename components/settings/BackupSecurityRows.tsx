import { type ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable } from "react-native";
import { Text, YStack } from "tamagui";
import { useConfirmDialog } from "@/components/common/useConfirmDialog";
import { CloudUpload, Lock } from "@/components/icons";
import { BackupSecretSheet } from "@/components/settings/BackupSecretSheet";
import {
  type EncryptionActions,
  EncryptionSheet,
  type EncryptionSheetMode,
} from "@/components/settings/EncryptionSheet";
import { LastBackupLine } from "@/components/settings/LastBackupLine";
import { PasswordCheckFlow } from "@/components/settings/PasswordCheckFlow";
import { SettingRow } from "@/components/settings/SettingRow";
import { SyncSetupSheet } from "@/components/settings/SyncSetupSheet";
import { SyncStatusSheet } from "@/components/settings/SyncStatusSheet";
import { hasGpsHistory } from "@/db/gps";
import { useBackupEncryption } from "@/hooks/useBackupEncryption";
import { type ConnectNext, useDeviceSync } from "@/hooks/useDeviceSync";
import { i18n } from "@/i18n";
import { answerPasswordCheck } from "@/src/passwordReminders";
import { reportError } from "@/src/reportError";

/**
 * "Encrypt my backups" and "Sync my devices", with the sheets they open. One component because
 * the second leans on the first: sync only sends what encryption seals. Connecting a server
 * decides the rest (`ConnectNext`): join the vault already there with its password, or turn
 * encryption on first, and only then sync.
 */
export function BackupSecurityRows({
  disabled,
  autoFolder,
  onLocalCopy,
  children,
}: {
  disabled: boolean;
  /** Where the automatic backup writes, `null` while it is off. */
  autoFolder: string | null;
  /** The automatic backup's own switch (turn off, change folder, or turn on). */
  onLocalCopy: () => void;
  /** The rows that sit between "where is my hero" and the password: saving a file. */
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  const encryption = useBackupEncryption();
  const deviceSync = useDeviceSync();
  const { ask, dialog } = useConfirmDialog();
  const [setupOpen, setSetupOpen] = useState(false);
  const [joining, setJoining] = useState<{ peer: string; wrong: boolean } | null>(null);
  // A server connected while encryption was off: the first sync waits for the key to exist.
  const [syncAfterEncrypt, setSyncAfterEncrypt] = useState(false);
  const [encryptionSheet, setEncryptionSheet] = useState<EncryptionSheetMode | null>(null);
  // Bumped per opening and used as the sheet's `key`, so every opening starts with empty fields.
  const [encryptionSheetId, setEncryptionSheetId] = useState(0);

  // Only worth saying when a file written now would be readable by whoever opens it and would
  // carry where the hero has been: no password, and at least one stored trace.
  const [hasTrace, setHasTrace] = useState(false);
  useEffect(() => {
    hasGpsHistory()
      .then(setHasTrace)
      .catch((e) => reportError("backup.gpsHistory", e));
  }, []);
  const gpsNotice = hasTrace && encryption.status === "off";

  const openEncryptionSheet = (mode: EncryptionSheetMode) => {
    setEncryptionSheetId((id) => id + 1);
    setEncryptionSheet(mode);
  };

  const showWords = () => {
    encryption
      .recovery()
      .then((words) => {
        if (words !== null) openEncryptionSheet({ kind: "recovery", words });
      })
      .catch((e) => reportError("backup.encryption.recovery", e));
  };

  /**
   * A setup left half-way (the words were made and never typed back) picks up at the check when
   * this phone can show them again, and otherwise offers new words or a new password.
   */
  const resumeCheck = () => {
    if (!encryption.canShowRecoveryAgain) {
      openEncryptionSheet({ kind: "verify", words: null });
      return;
    }
    encryption
      .recovery()
      .then((words) => openEncryptionSheet({ kind: "verify", words }))
      .catch((e) => reportError("backup.encryption.resume", e));
  };

  const onEncryptionRow = () => {
    // A locked phone has no key but its hero has a vault: a new password would make a second one.
    if (encryption.status === "locked") openEncryptionSheet({ kind: "unlock" });
    else if (encryption.status !== "on") openEncryptionSheet({ kind: "enable" });
    else if (encryption.format === 2 && encryption.updateOffered)
      openEncryptionSheet({ kind: "update" });
    else if (encryption.wordsToCheck) resumeCheck();
    else openEncryptionSheet({ kind: "manage" });
  };

  // Turning encryption off stops sync too, and says so: sync only ever sends sealed files, and
  // leaving it connected would fail at every launch under "could not reach your server".
  function confirmDisable() {
    setEncryptionSheet(null);
    // With sync on, what stops first is what the hero would miss first.
    const syncing = deviceSync.account !== null;
    const message = syncing
      ? `${t("backup.encryptionOffStopsSync")} ${t("backup.encryptionOffConfirm")}`
      : t("backup.encryptionOffConfirm");
    ask({
      title: t("backup.encryption"),
      body: message,
      cancelLabel: t("common.cancel"),
      confirmLabel: syncing ? t("backup.encryptionOffStopSyncCta") : t("backup.encryptionOffCta"),
      destructive: true,
      onConfirm: () => {
        const stopSync = deviceSync.account === null ? Promise.resolve() : deviceSync.disconnect();
        stopSync
          .then(() => encryption.disable())
          .catch((e) => reportError("backup.encryption.disable", e));
      },
    });
  }

  const enable = (password: string) =>
    encryption.enable(password).then((recovery) => {
      if (recovery !== null && syncAfterEncrypt) {
        setSyncAfterEncrypt(false);
        deviceSync.firstSync().catch((e) => reportError("sync.first", e));
      }
      return recovery;
    });

  /** What follows a server accepting the hero; `true` closes the setup sheet. */
  const follow = (next: ConnectNext): boolean => {
    if (next.next === "join") setJoining({ peer: next.peer, wrong: false });
    if (next.next === "encrypt") {
      setSyncAfterEncrypt(true);
      openEncryptionSheet({ kind: "enable" });
    }
    return next.next !== "failed";
  };

  /**
   * A connection the hero walked away from halfway: no encryption for a server waiting on it.
   * Left connected, every launch sync would fail on it.
   */
  const abandonConnect = () => {
    setSyncAfterEncrypt(false);
    deviceSync.disconnect().catch((e) => reportError("sync.abandon", e));
  };

  const submitJoin = (secret: string) => {
    if (joining === null) return;
    const { peer } = joining;
    return deviceSync
      .join(peer, secret)
      .then((joined) => {
        setJoining(joined ? null : { peer, wrong: true });
        if (joined) encryption.refresh();
      })
      .catch((e) => reportError("sync.join", e));
  };

  const [statusOpen, setStatusOpen] = useState(false);
  const openSync = () => {
    if (deviceSync.account === null) setSetupOpen(true);
    else setStatusOpen(true);
  };

  const [checking, setChecking] = useState(false);

  const encryptionActions: EncryptionActions = {
    enable,
    change: encryption.change,
    newWords: encryption.newWords,
    forgot: encryption.forgot,
    updateBlocked: encryption.updateBlocked,
    wordsChecked: encryption.wordsChecked,
    showWords,
    remind: encryption.remind,
    checkPassword: () => {
      setEncryptionSheet(null);
      setChecking(true);
    },
    update: () => openEncryptionSheet({ kind: "update" }),
    forgotOpen: () => openEncryptionSheet({ kind: "forgot" }),
    newWordsOpen: () => openEncryptionSheet({ kind: "newWords" }),
    changeOpen: () => openEncryptionSheet({ kind: "change" }),
    disable: confirmDisable,
    unlock: encryption.unlock,
    unlockSources: encryption.unlockSources,
  };

  // Sync names the place when it is on or was lost; otherwise the daily copy's folder, else a
  // nudge. A hero with only the automatic backup sees it here exactly as the old row said it.
  const shelterValue =
    deviceSync.account !== null || deviceSync.lost
      ? deviceSync.rowValue
      : (autoFolder ?? t("shelter.choose"));

  const encryptionValue = (() => {
    if (encryption.status === "locked") return t("vault.rowAskAgain");
    if (encryption.status === "off") return t("vault.rowNone");
    if (encryption.format === 2)
      return t(encryption.updateOffered ? "vault.rowUpdate" : "vault.rowYes");
    return encryption.wordsToCheck ? t("vault.rowCheckWords") : t("vault.rowYes");
  })();

  return (
    <>
      {/* One row for both ways of keeping the hero somewhere: a folder written once a day, and
          a server or shared folder kept in step across devices. The sheet behind it decides. */}
      <SettingRow
        testID="settings-sync"
        icon={<CloudUpload size={22} color="$text" />}
        label={t("shelter.row")}
        value={shelterValue}
        disabled={disabled || deviceSync.running}
        onPress={openSync}
      />
      <LastBackupLine folderOn={autoFolder !== null} />

      {children}

      {gpsNotice ? (
        <Pressable
          testID="settings-gps-notice"
          accessibilityRole="button"
          onPress={() => openEncryptionSheet({ kind: "enable" })}
        >
          <YStack minH={44} justify="center">
            <Text fontSize="$3" color="$textSecondary" px="$1">
              {t("backup.gpsNotice")}
            </Text>
          </YStack>
        </Pressable>
      ) : null}

      {/* Next to the places because it changes what every backup row writes: on, a share, a saved
          file and the daily copy are all sealed with the same key. Locked (a new phone whose key
          did not follow) nothing is written until the password is set again. */}
      <SettingRow
        testID="settings-encrypt-backup"
        icon={<Lock size={22} color="$text" />}
        label={t("backup.encryption")}
        value={encryptionValue}
        disabled={disabled}
        onPress={onEncryptionRow}
      />

      {deviceSync.account ? (
        <SyncStatusSheet
          open={statusOpen}
          account={deviceSync.account}
          onClose={() => setStatusOpen(false)}
          local={{ folder: autoFolder, onPress: onLocalCopy }}
          onTest={deviceSync.testConnection}
          onSyncNow={() => {
            deviceSync.syncNow().catch((e) => reportError("sync.now", e));
          }}
          onStop={() => {
            setStatusOpen(false);
            deviceSync.disconnect().catch((e) => reportError("sync.disconnect", e));
          }}
        />
      ) : null}
      <SyncSetupSheet
        context="settings"
        open={setupOpen}
        onClose={() => setSetupOpen(false)}
        onConnectNextcloud={(server) => deviceSync.connect(server).then(follow)}
        onCancelNextcloud={deviceSync.cancelConnect}
        onTest={deviceSync.testConnection}
        onConnectFolder={(uri) => deviceSync.connectFolder(uri).then(follow)}
        backupFolder={deviceSync.backupFolder}
        local={{ folder: autoFolder, onPress: onLocalCopy, gpsNotice }}
        onConnectDav={(url, user, password, label) =>
          deviceSync.connectDav(url, user, password, label).then(follow)
        }
      />
      <BackupSecretSheet
        request={{ open: joining !== null, wrong: joining?.wrong ?? false }}
        title={t("sync.joinTitle")}
        body={t("sync.joinBody")}
        submitLabel={t("sync.useThisPassword")}
        forgotHint={t("sync.secretForgot")}
        onSubmit={submitJoin}
        // Walking away pauses, it does not disconnect: sync keeps the account, sends nothing
        // while that device's vault is unknown here (`holdBack`), asks again next launch, and the
        // row says it is waiting. Disconnecting here was a sync that vanished for no visible reason.
        onCancel={() => setJoining(null)}
      />
      <EncryptionSheet
        key={encryptionSheetId}
        mode={encryptionSheet}
        language={i18n.language}
        format={encryption.format}
        updateOffered={encryption.updateOffered}
        canShowWordsAgain={encryption.canShowRecoveryAgain}
        actions={encryptionActions}
        onClose={() => {
          if (encryptionSheet === null) return;
          setEncryptionSheet(null);
          if (syncAfterEncrypt) abandonConnect();
        }}
      />
      <PasswordCheckFlow
        open={checking}
        onClose={() => setChecking(false)}
        onAnswer={(answer) => {
          // A check the hero asked for is not an ignored reminder: "Later" here must not push
          // the schedule that the Home card keeps.
          if (answer === "ignored") return;
          answerPasswordCheck(answer).catch((e) => reportError("password.answer", e));
        }}
      />
      {dialog}
    </>
  );
}
