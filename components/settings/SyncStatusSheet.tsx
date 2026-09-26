import type { TFunction } from "i18next";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";
import { Text, YStack } from "tamagui";

import { AppButton } from "@/components/common/AppButton";
import { FormSheet } from "@/components/common/FormSheet";
import { Wifi } from "@/components/icons";
import { SettingRow } from "@/components/settings/SettingRow";
import type { SyncFailure } from "@/src/cloudSync";
import {
  accountLabel,
  type LastMerge,
  lastMerge,
  type SyncAccount,
  setSyncWifiOnly,
  syncFolderOf,
  syncWifiOnly,
} from "@/src/deviceSync";
import { reportError } from "@/src/reportError";
import { failureMessage, syncAgo } from "@/src/syncWords";
import { useSyncStore } from "@/stores/sync";

type Props = {
  open: boolean;
  account: SyncAccount;
  onClose: () => void;
  onSyncNow: () => void;
  onStop: () => void;
};

/**
 * Sync's state, where the Settings row used to open a native alert with three buttons and a
 * timestamp in a sentence: what it is doing or waiting for, where the files go, every other
 * device the server holds and how it stands, what the last merge brought, and the switches.
 * The technical hero asked for a view of it; the one who is not asked for "2 min ago" instead of
 * a server address (docs/design/audits/2026-09-26-sync-journeys.md, F6).
 */
export function SyncStatusSheet({ open, account, onClose, onSyncNow, onStop }: Props) {
  const { t } = useTranslation();
  const running = useSyncStore((s) => s.running);
  const failure = useSyncStore((s) => s.failure);
  const waitingWifi = useSyncStore((s) => s.waitingWifi);
  const lastSyncAt = useSyncStore((s) => s.lastSyncAt);
  const peers = useSyncStore((s) => s.result?.peers ?? []);
  const [merge, setMerge] = useState<LastMerge | null>(null);
  const [wifiOnly, setWifiOnly] = useState(false);
  const { folder, user } = syncFolderOf(account);

  useEffect(() => {
    if (!open) return;
    Promise.all([lastMerge(), syncWifiOnly()])
      .then(([m, w]) => {
        setMerge(m);
        setWifiOnly(w);
      })
      .catch((error: unknown) => reportError("sync.sheet", error));
  }, [open]);

  const status = statusLine(t, { running, waitingWifi, failure, lastSyncAt });

  const confirmStop = () => {
    Alert.alert(
      t("sync.stopTitle"),
      account.kind === "nextcloud" ? t("sync.stopBodyNextcloud") : t("sync.stopBodyWebdav"),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("sync.stopCta"), style: "destructive", onPress: onStop },
      ],
    );
  };

  return (
    <FormSheet open={open} title={t("sync.row")} onClose={onClose}>
      <Text testID="sync-status" color="$text" fontSize="$4">
        {status}
      </Text>

      <YStack gap="$1">
        <Text color="$textSecondary" fontSize="$3">
          {account.kind === "folder"
            ? t("sync.status.whereFolder")
            : t("sync.status.where", { server: accountLabel(account) })}
        </Text>
        <Text testID="sync-folder" color="$textSecondary" fontSize="$2" selectable>
          {folder}
        </Text>
        {user ? (
          <Text color="$textSecondary" fontSize="$2">
            {t("sync.status.user", { user })}
          </Text>
        ) : null}
      </YStack>

      <YStack gap="$1">
        <Text color="$text" fontWeight="700">
          {t("sync.status.devices")}
        </Text>
        {peers.length === 0 ? (
          <Text color="$textSecondary" fontSize="$3">
            {t("sync.status.noDevices")}
          </Text>
        ) : (
          peers.map((peer) => (
            <Text key={peer.name} testID="sync-peer" color="$textSecondary" fontSize="$3">
              {t("sync.status.device", {
                id: shortId(peer.name),
                state: t(`sync.peerState.${peer.state}`),
                when: peer.modified ? syncAgo(t, peer.modified) : t("sync.status.unknownWhen"),
              })}
            </Text>
          ))
        )}
      </YStack>

      {merge ? (
        <Text testID="sync-last-merge" color="$textSecondary" fontSize="$3">
          {t("sync.status.lastMerge", {
            count: merge.sessions,
            when: syncAgo(t, merge.at),
            id: shortId(merge.peer),
          })}
          {merge.kept ? ` ${t("sync.status.kept", { file: merge.kept })}` : ""}
        </Text>
      ) : null}

      <SettingRow
        testID="sync-wifi-only"
        icon={<Wifi size={22} color="$text" />}
        label={t("sync.wifiOnly")}
        value={wifiOnly ? t("common.on") : t("common.off")}
        onPress={() => {
          const next = !wifiOnly;
          setWifiOnly(next);
          setSyncWifiOnly(next).catch((error: unknown) => reportError("sync.wifiOnly", error));
        }}
      />
      <Text color="$textSecondary" fontSize="$2">
        {t("sync.wifiOnlyNote")}
      </Text>

      <AppButton testID="sync-now" disabled={running} onPress={onSyncNow}>
        {t("sync.now")}
      </AppButton>
      <AppButton testID="sync-stop" variant="outline" onPress={confirmStop}>
        {t("sync.stopCta")}
      </AppButton>
    </FormSheet>
  );
}

/** What sync is doing, or waiting for, or how it went, in one sentence. */
function statusLine(
  t: TFunction,
  state: {
    running: boolean;
    waitingWifi: boolean;
    failure: SyncFailure | null;
    lastSyncAt: number | null;
  },
): string {
  if (state.running) return t("sync.running");
  if (state.waitingWifi) return t("sync.waitingWifi");
  if (state.failure) return failureMessage(t, state.failure);
  if (state.lastSyncAt === null) return t("sync.status.never");
  return t("sync.status.upToDate", { when: syncAgo(t, state.lastSyncAt) });
}

/** `bati-50255d3e-….batb` → `50255d3e`: enough to tell devices apart, short enough to read. */
function shortId(file: string): string {
  return /^bati-([0-9a-f]{8})/.exec(file)?.[1] ?? file;
}
