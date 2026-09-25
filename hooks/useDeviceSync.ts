import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useToast } from "@/components/common/Toast";
import type { NextcloudAccount } from "@/src/cloudSync";
import { connectNextcloud, disconnectSync, syncAccount } from "@/src/deviceSync";
import { reportError } from "@/src/reportError";
import { useSyncStore } from "@/stores/sync";

/** `https://cloud.example.org` → `cloud.example.org`, what the Settings row shows. */
export function syncHostLabel(account: NextcloudAccount): string {
  return account.server.replace(/^https?:\/\//, "");
}

/**
 * Settings' half of device sync: which account, and the three things to do with it. Like the
 * other backup hooks, every action reports its own failure and never throws.
 */
export function useDeviceSync() {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const [account, setAccount] = useState<NextcloudAccount | null>(null);
  const running = useSyncStore((s) => s.running);
  const run = useSyncStore((s) => s.run);
  // Set by "cancel" while the browser login is being polled; read between polls.
  const cancelled = useRef(false);

  useEffect(() => {
    syncAccount()
      .then(setAccount)
      .catch((error) => reportError("sync.account", error));
  }, []);

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
      setAccount(connected);
      await run({ snapshotFirst: true });
      if (useSyncStore.getState().failed) showError(t("sync.failed"));
      else showSuccess(t("sync.connected", { host: syncHostLabel(connected) }));
      return true;
    },
    [run, showError, showSuccess, t],
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
      ? syncHostLabel(account)
      : t("backup.encryptionOff");

  return { account, running, rowValue, connect, cancelConnect, syncNow, disconnect };
}
