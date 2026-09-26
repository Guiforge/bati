import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";
import { CloudUpload, Lock } from "@/components/icons";
import { BackupSecretSheet } from "@/components/settings/BackupSecretSheet";
import { EncryptionSheet, type EncryptionSheetMode } from "@/components/settings/EncryptionSheet";
import { SettingRow } from "@/components/settings/SettingRow";
import { SyncSetupSheet } from "@/components/settings/SyncSetupSheet";
import { SyncStatusSheet } from "@/components/settings/SyncStatusSheet";
import { useBackupEncryption } from "@/hooks/useBackupEncryption";
import { type ConnectNext, useDeviceSync } from "@/hooks/useDeviceSync";
import { reportError } from "@/src/reportError";

/**
 * "Encrypt my backups" and "Sync my devices", with the sheets they open. One component because
 * the second leans on the first: sync only sends what encryption seals. Connecting a server
 * decides the rest (`ConnectNext`): join the vault already there with its password, or turn
 * encryption on first, and only then sync.
 */
export function BackupSecurityRows({ disabled }: { disabled: boolean }) {
  const { t } = useTranslation();
  const encryption = useBackupEncryption();
  const deviceSync = useDeviceSync();
  const [setupOpen, setSetupOpen] = useState(false);
  const [joining, setJoining] = useState<{ peer: string; wrong: boolean } | null>(null);
  // A server connected while encryption was off: the first sync waits for the key to exist.
  const [syncAfterEncrypt, setSyncAfterEncrypt] = useState(false);
  const [encryptionSheet, setEncryptionSheet] = useState<EncryptionSheetMode | null>(null);
  // Bumped per opening and used as the sheet's `key`, so every opening starts with empty fields.
  const [encryptionSheetId, setEncryptionSheetId] = useState(0);

  const openEncryptionSheet = (mode: EncryptionSheetMode) => {
    setEncryptionSheetId((id) => id + 1);
    setEncryptionSheet(mode);
  };

  const showRecoveryKey = () => {
    encryption
      .recovery()
      .then((recovery) => {
        if (recovery !== null) openEncryptionSheet({ kind: "recovery", recovery });
      })
      .catch((e) => reportError("backup.encryption.recovery", e));
  };

  // Turning encryption off stops sync too, and says so: sync only ever sends sealed files, and
  // leaving it connected would fail at every launch under "could not reach your server".
  const confirmDisable = () => {
    setEncryptionSheet(null);
    const message =
      deviceSync.account === null
        ? t("backup.encryptionOffConfirm")
        : `${t("backup.encryptionOffConfirm")} ${t("backup.encryptionOffStopsSync")}`;
    Alert.alert(t("backup.encryption"), message, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("backup.encryptionOffCta"),
        style: "destructive",
        onPress: () => {
          const stopSync =
            deviceSync.account === null ? Promise.resolve() : deviceSync.disconnect();
          stopSync
            .then(() => encryption.disable())
            .catch((e) => reportError("backup.encryption.disable", e));
        },
      },
    ]);
  };

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
    deviceSync
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

  const encryptionValue =
    encryption.status === "on"
      ? t("backup.encryptionOn")
      : encryption.status === "locked"
        ? t("backup.encryptionLocked")
        : t("backup.encryptionOff");

  return (
    <>
      {/* Next to automatic backup because it changes what every backup row writes: on, a share,
          a saved file and the daily copy are all sealed with the same key. Locked (a new phone
          whose key did not follow) nothing is written until the password is set again. */}
      <SettingRow
        testID="settings-encrypt-backup"
        icon={<Lock size={22} color="$text" />}
        label={t("backup.encryption")}
        value={encryptionValue}
        disabled={disabled}
        onPress={() =>
          openEncryptionSheet({ kind: encryption.status === "on" ? "manage" : "enable" })
        }
      />

      <SettingRow
        testID="settings-sync"
        icon={<CloudUpload size={22} color="$text" />}
        label={t("sync.row")}
        value={deviceSync.rowValue}
        disabled={disabled || deviceSync.running}
        onPress={openSync}
      />

      {deviceSync.account ? (
        <SyncStatusSheet
          open={statusOpen}
          account={deviceSync.account}
          onClose={() => setStatusOpen(false)}
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
        open={setupOpen}
        onClose={() => setSetupOpen(false)}
        onConnectNextcloud={(server) => deviceSync.connect(server).then(follow)}
        onCancelNextcloud={deviceSync.cancelConnect}
        onConnectDav={(url, user, password, label) =>
          deviceSync.connectDav(url, user, password, label).then(follow)
        }
      />
      <BackupSecretSheet
        request={{ open: joining !== null, wrong: joining?.wrong ?? false }}
        title={t("sync.joinTitle")}
        body={t("sync.joinBody")}
        onSubmit={submitJoin}
        // Walking away pauses, it does not disconnect: sync keeps the account, sends nothing
        // while that device's vault is unknown here (`holdBack`), asks again next launch, and the
        // row says it is waiting. Disconnecting here was a sync that vanished for no visible reason.
        onCancel={() => setJoining(null)}
      />
      <EncryptionSheet
        key={encryptionSheetId}
        mode={encryptionSheet}
        canShowRecoveryAgain={encryption.canShowRecoveryAgain}
        onClose={() => {
          if (encryptionSheet === null) return;
          setEncryptionSheet(null);
          if (syncAfterEncrypt) abandonConnect();
        }}
        onEnable={enable}
        onChange={encryption.change}
        onShowRecovery={showRecoveryKey}
        onDisable={confirmDisable}
      />
    </>
  );
}
