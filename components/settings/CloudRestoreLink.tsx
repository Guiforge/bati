import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/components/common/Toast";
import { BackupSecretSheet } from "@/components/settings/BackupSecretSheet";
import { SyncSetupSheet } from "@/components/settings/SyncSetupSheet";
import { type ConnectNext, useDeviceSync } from "@/hooks/useDeviceSync";
import { reportError } from "@/src/reportError";

/**
 * Onboarding's second way back to a hero: from the cloud, rather than from a file. Opened from
 * the single "Restore my hero" link on the first screen, which asks which source. Connecting
 * the server and giving the password is all it asks; the sync that follows finds the other
 * device ahead of this empty one, and components/SyncPrompt.tsx offers to take its version, so
 * no village is built only to be replaced.
 *
 * A server with nothing on it yet is not a way back: the connection is dropped again and the
 * hero is told, rather than left connected with encryption off, which sync refuses.
 */
export function CloudRestoreLink({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { showError } = useToast();
  const deviceSync = useDeviceSync();
  const [joining, setJoining] = useState<{ peer: string; wrong: boolean } | null>(null);

  const follow = (next: ConnectNext): boolean => {
    if (next.next === "join") setJoining({ peer: next.peer, wrong: false });
    if (next.next === "encrypt") {
      showError(t("sync.serverEmpty"));
      deviceSync.disconnect().catch((e) => reportError("sync.disconnect", e));
    }
    return next.next !== "failed";
  };

  const submitJoin = (secret: string) => {
    if (joining === null) return;
    const { peer } = joining;
    return deviceSync
      .join(peer, secret)
      .then((joined) => setJoining(joined ? null : { peer, wrong: true }))
      .catch((e) => reportError("sync.join", e));
  };

  return (
    <>
      <SyncSetupSheet
        context="onboarding"
        open={open}
        onClose={onClose}
        onConnectNextcloud={(server) => deviceSync.connect(server).then(follow)}
        onCancelNextcloud={deviceSync.cancelConnect}
        onConnectFolder={(uri) => deviceSync.connectFolder(uri).then(follow)}
        backupFolder={deviceSync.backupFolder}
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
        onCancel={() => setJoining(null)}
      />
    </>
  );
}
