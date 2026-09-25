import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useToast } from "@/components/common/Toast";
import { DavAuthError } from "@/src/cloudSync";
import {
  accountLabel,
  connectNextcloud,
  connectWebDav,
  disconnectSync,
  type SyncAccount,
  syncAccount,
} from "@/src/deviceSync";
import { reportError } from "@/src/reportError";
import { useSyncStore } from "@/stores/sync";

/**
 * Settings' half of device sync: which account, and the things to do with it. Like the other
 * backup hooks, every action reports its own failure and never throws.
 */
export function useDeviceSync() {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const [account, setAccount] = useState<SyncAccount | null>(null);
  const running = useSyncStore((s) => s.running);
  const run = useSyncStore((s) => s.run);
  // Set by "cancel" while the browser login is being polled; read between polls.
  const cancelled = useRef(false);

  useEffect(() => {
    syncAccount()
      .then(setAccount)
      .catch((error) => reportError("sync.account", error));
  }, []);

  /** Remembers a working account, runs its first sync, and says how that went. */
  const firstSync = useCallback(
    async (connected: SyncAccount) => {
      setAccount(connected);
      await run({ snapshotFirst: true });
      if (useSyncStore.getState().failed) showError(t("sync.failed"));
      else showSuccess(t("sync.connected", { host: accountLabel(connected) }));
    },
    [run, showError, showSuccess, t],
  );

  /** `true` once signed in and the first sync has run. */
  const connect = useCallback(
    async (server: string): Promise<boolean> => {
      cancelled.current = false;
      const connected = await connectNextcloud(server, () => cancelled.current).catch(
        (error: unknown) => {
          reportError("sync.connect", error);
          showError(t("sync.connectFailed"));
          return null;
        },
      );
      if (connected === null) return false;
      await firstSync(connected);
      return true;
    },
    [firstSync, showError, t],
  );

  /** Same, for any WebDAV server. Refused credentials get their own message. */
  const connectDav = useCallback(
    async (url: string, user: string, password: string): Promise<boolean> => {
      const connected = await connectWebDav(url, user, password).catch((error: unknown) => {
        reportError("sync.connectDav", error);
        showError(
          error instanceof DavAuthError ? t("sync.webdavAuthFailed") : t("sync.webdavFailed"),
        );
        return null;
      });
      if (connected === null) return false;
      await firstSync(connected);
      return true;
    },
    [firstSync, showError, t],
  );

  const cancelConnect = useCallback(() => {
    cancelled.current = true;
  }, []);

  const syncNow = useCallback(async () => {
    await run({ snapshotFirst: true });
    if (useSyncStore.getState().failed) showError(t("sync.failed"));
    else showSuccess(t("sync.done"));
  }, [run, showError, showSuccess, t]);

  const disconnect = useCallback(
    () =>
      disconnectSync().then(
        () => {
          setAccount(null);
          showSuccess(t("sync.disconnected"));
        },
        (error: unknown) => reportError("sync.disconnect", error),
      ),
    [showSuccess, t],
  );

  /** What the Settings row says: the server while connected, its state while it works. */
  const rowValue = running
    ? t("sync.running")
    : account
      ? accountLabel(account)
      : t("backup.encryptionOff");

  return {
    account,
    running,
    rowValue,
    connect,
    connectDav,
    cancelConnect,
    syncNow,
    disconnect,
  };
}
