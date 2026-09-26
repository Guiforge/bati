import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useToast } from "@/components/common/Toast";
import { preferences } from "@/db/preferences";
import { backupFolderLabel } from "@/src/autoBackup";
import { encryptionStatus } from "@/src/backupCipher";
import { DavAuthError, failureOf, InsecureAddressError, type SyncFailure } from "@/src/cloudSync";
import {
  accountLabel,
  connectFolder,
  connectNextcloud,
  connectWebDav,
  disconnectSync,
  joinPeer,
  lostSync,
  type SyncAccount,
  serverState,
  syncAccount,
} from "@/src/deviceSync";
import { reportError } from "@/src/reportError";
import { failureMessage } from "@/src/syncWords";
import { useSyncStore } from "@/stores/sync";

/**
 * What the Settings rows do after a server accepted the hero:
 * - `join`: it already holds another device's files, sealed with a password this phone must
 *   learn; asking it is what keeps one vault instead of two.
 * - `encrypt`: nothing there yet and encryption is off here; sync only sends sealed files.
 * - `done`: the first sync ran.
 * - `failed`: said already, in a toast.
 */
export type ConnectNext =
  | { next: "join"; peer: string }
  | { next: "encrypt" }
  | { next: "done" }
  | { next: "failed" };

/**
 * Settings' half of device sync: which account, and the things to do with it. Like the other
 * backup hooks, every action reports its own failure and never throws. No `useCallback`: the
 * React Compiler memoises what this returns (docs/architecture/performance.md).
 */
export function useDeviceSync() {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const [account, setAccount] = useState<SyncAccount | null>(null);
  // The server sync was on with, when it stopped without the hero asking (see `lostSync`).
  const [lost, setLost] = useState<string | null>(null);
  // The automatic backup's folder, offered as the synced folder too.
  const [backupFolder, setBackupFolder] = useState<{ uri: string; label: string } | null>(null);
  const running = useSyncStore((s) => s.running);
  const failure = useSyncStore((s) => s.failure);
  const waitingWifi = useSyncStore((s) => s.waitingWifi);
  const waitingPassword = useSyncStore(
    (s) => s.result?.peers.some((p) => p.state === "locked") ?? false,
  );
  const lastSyncAt = useSyncStore((s) => s.lastSyncAt);
  const run = useSyncStore((s) => s.run);
  // Set by "cancel" while the browser login is being polled; read between polls.
  const cancelled = useRef(false);

  useEffect(() => {
    syncAccount()
      .then(setAccount)
      .catch((error) => reportError("sync.account", error));
    lostSync()
      .then(setLost)
      .catch((error) => reportError("sync.lost", error));
    preferences
      .getBackupFolderUri()
      .then((uri) => setBackupFolder(uri === null ? null : { uri, label: backupFolderLabel(uri) }))
      .catch((error) => reportError("sync.backupFolder", error));
  }, []);

  /** What the Settings row says: what sync is doing or waiting for, else the server. */
  const rowValue = (): string => {
    if (running) return t("sync.running");
    if (account === null) return lost ? t("sync.rowStopped") : t("sync.off");
    if (waitingPassword) return t("sync.waitingPassword");
    if (waitingWifi) return t("sync.waitingWifi");
    if (failure) return t("sync.rowFailing");
    return accountLabel(account);
  };

  /** One sync, and the one toast that says how it went. The hero asked: Wi-Fi only does not wait. */
  const syncAndSay = async (success: string) => {
    await run({ snapshotFirst: true, force: true });
    const { failure: failed } = useSyncStore.getState();
    if (failed) showError(failureMessage(t, failed));
    else showSuccess(success);
  };

  /** Decides what follows a server accepting the hero; see `ConnectNext`. */
  const afterConnect = async (connected: SyncAccount): Promise<ConnectNext> => {
    setAccount(connected);
    let failed: SyncFailure | null = null;
    const state = await serverState().catch((error: unknown) => {
      reportError("sync.serverState", error);
      failed = failureOf(error);
      return null;
    });
    if (state === null) {
      showError(failureMessage(t, failed ?? { kind: "unknown" }));
      return { next: "failed" };
    }
    if (state.kind === "needsSecret") return { next: "join", peer: state.peer };
    if ((await encryptionStatus()) !== "on") return { next: "encrypt" };
    await syncAndSay(t("sync.connected", { host: accountLabel(connected) }));
    return { next: "done" };
  };

  return {
    account,
    lost,
    backupFolder,
    running,
    lastSyncAt,
    rowValue: rowValue(),

    connect: async (server: string): Promise<ConnectNext> => {
      cancelled.current = false;
      const connected = await connectNextcloud(server, () => cancelled.current).catch(
        (error: unknown) => {
          reportError("sync.connect", error);
          showError(t("sync.connectFailed"));
          return null;
        },
      );
      return connected === null ? { next: "failed" } : afterConnect(connected);
    },

    /** Same, for any WebDAV server. Refused credentials and plain HTTP get their own message. */
    connectDav: async (
      url: string,
      user: string,
      password: string,
      label?: string,
    ): Promise<ConnectNext> => {
      const connected = await connectWebDav(url, user, password, label).catch((error: unknown) => {
        reportError("sync.connectDav", error);
        showError(
          error instanceof DavAuthError
            ? t("sync.webdavAuthFailed")
            : error instanceof InsecureAddressError
              ? t("sync.webdavInsecure")
              : failureOf(error).kind === "certificate"
                ? t("sync.failure.certificate")
                : t("sync.webdavFailed"),
        );
        return null;
      });
      return connected === null ? { next: "failed" } : afterConnect(connected);
    },

    /** A folder Syncthing replicates. The picker backed out of is not a failure: nothing is said. */
    connectFolder: async (uri?: string): Promise<ConnectNext> => {
      const connected = await connectFolder(uri).catch((error: unknown) => {
        reportError("sync.connectFolder", error);
        showError(t("sync.folder.failed"));
        return null;
      });
      return connected === null ? { next: "failed" } : afterConnect(connected);
    },

    /** `false` when the secret does not open that device's file; the sheet asks again. */
    join: async (peer: string, secret: string): Promise<boolean> => {
      const joined = await joinPeer(peer, secret).catch((error: unknown) => {
        reportError("sync.join", error);
        showError(failureMessage(t, failureOf(error)));
        return null;
      });
      if (joined) await syncAndSay(t("sync.joined"));
      return joined !== false;
    },

    /** The first sync of a server that was waiting for encryption to be turned on. */
    firstSync: () => syncAndSay(t("sync.done")),

    cancelConnect: () => {
      cancelled.current = true;
    },

    syncNow: () => syncAndSay(t("sync.done")),

    disconnect: () =>
      disconnectSync().then(
        () => {
          setAccount(null);
          setLost(null);
          showSuccess(t("sync.disconnected"));
        },
        (error: unknown) => reportError("sync.disconnect", error),
      ),
  };
}
