import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";
import { CloudUpload, Lock } from "@/components/icons";
import { EncryptionSheet, type EncryptionSheetMode } from "@/components/settings/EncryptionSheet";
import { NextcloudSheet } from "@/components/settings/NextcloudSheet";
import { SettingRow } from "@/components/settings/SettingRow";
import { useBackupEncryption } from "@/hooks/useBackupEncryption";
import { syncHostLabel, useDeviceSync } from "@/hooks/useDeviceSync";
import { reportError } from "@/src/reportError";

/**
 * "Encrypt my backups" and "Sync my devices", with the sheets they open. One component because
 * the second depends on the first: sync only sends what encryption seals, and its row sends the
 * hero to encryption's setup when that is off.
 */
export function BackupSecurityRows({ disabled }: { disabled: boolean }) {
  const { t } = useTranslation();
  const encryption = useBackupEncryption();
  const deviceSync = useDeviceSync();
  const [nextcloudOpen, setNextcloudOpen] = useState(false);
  const [encryptionSheet, setEncryptionSheet] = useState<EncryptionSheetMode | null>(null);
  // Bumped per opening and used as the sheet's `key`, so every opening starts with empty fields.
  const [encryptionSheetId, setEncryptionSheetId] = useState(0);
  const openEncryptionSheet = useCallback((mode: EncryptionSheetMode) => {
    setEncryptionSheetId((id) => id + 1);
    setEncryptionSheet(mode);
  }, []);

  const showRecoveryKey = useCallback(() => {
    encryption
      .recovery()
      .then((recovery) => {
        if (recovery !== null) openEncryptionSheet({ kind: "recovery", recovery });
      })
      .catch((e) => reportError("backup.encryption.recovery", e));
  }, [encryption, openEncryptionSheet]);

  // Off: one tap into setup. On: the same three-button order as `confirmAuto` in
  // app/settings.tsx, destructive in the middle, for the reason written there. "Show the recovery
  // key" only exists where a fingerprint could have kept it.
  const confirmEncryption = useCallback(() => {
    if (encryption.status === "off") {
      openEncryptionSheet({ kind: "enable" });
      return;
    }
    const buttons: Parameters<typeof Alert.alert>[2] = [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("backup.encryptionOffCta"),
        style: "destructive",
        onPress: () =>
          Alert.alert(t("backup.encryption"), t("backup.encryptionOffConfirm"), [
            { text: t("common.cancel"), style: "cancel" },
            {
              text: t("backup.encryptionOffCta"),
              style: "destructive",
              onPress: () => {
                encryption.disable().catch((e) => reportError("backup.encryption.disable", e));
              },
            },
          ]),
      },
      encryption.canShowRecoveryAgain
        ? { text: t("backup.showRecovery"), onPress: showRecoveryKey }
        : {
            text: t("backup.changePassword"),
            onPress: () => openEncryptionSheet({ kind: "change" }),
          },
    ];
    Alert.alert(t("backup.encryption"), t("backup.encryptionOnMessage"), buttons);
  }, [encryption, openEncryptionSheet, showRecoveryKey, t]);

  // Sync only ever sends sealed files, so it starts from encryption: off, the row sets that up
  // first and says why. On, the same three-button order as the rows above.
  const confirmSync = useCallback(() => {
    const account = deviceSync.account;
    if (account === null) {
      if (encryption.status === "on") {
        setNextcloudOpen(true);
        return;
      }
      Alert.alert(t("sync.row"), t("sync.needsEncryption"), [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("backup.encryptionCta"), onPress: () => openEncryptionSheet({ kind: "enable" }) },
      ]);
      return;
    }
    Alert.alert(t("sync.row"), t("sync.onMessage", { host: syncHostLabel(account) }), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("sync.disconnect"),
        style: "destructive",
        onPress: () => {
          deviceSync.disconnect().catch((e) => reportError("sync.disconnect", e));
        },
      },
      {
        text: t("sync.now"),
        onPress: () => {
          deviceSync.syncNow().catch((e) => reportError("sync.now", e));
        },
      },
    ]);
  }, [deviceSync, encryption.status, openEncryptionSheet, t]);

  return (
    <>
      {/* Next to automatic backup because it changes what every backup row writes: on, a
              share, a saved file and the daily copy are all sealed with the same key. */}
      <SettingRow
        testID="settings-encrypt-backup"
        icon={<Lock size={22} color="$text" />}
        label={t("backup.encryption")}
        value={encryption.status === "on" ? t("backup.encryptionOn") : t("backup.encryptionOff")}
        disabled={disabled}
        onPress={confirmEncryption}
      />

      {/* After encryption because it depends on it: sync only sends what that row seals. */}
      <SettingRow
        testID="settings-sync"
        icon={<CloudUpload size={22} color="$text" />}
        label={t("sync.row")}
        value={deviceSync.rowValue}
        disabled={disabled || deviceSync.running}
        onPress={confirmSync}
      />
      <NextcloudSheet
        open={nextcloudOpen}
        onClose={() => setNextcloudOpen(false)}
        onConnect={deviceSync.connect}
        onCancel={deviceSync.cancelConnect}
      />
      <EncryptionSheet
        key={encryptionSheetId}
        mode={encryptionSheet}
        canShowRecoveryAgain={encryption.canShowRecoveryAgain}
        onClose={() => setEncryptionSheet(null)}
        onEnable={encryption.enable}
        onChange={encryption.change}
      />
    </>
  );
}
