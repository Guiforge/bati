import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Text } from "tamagui";
import { useToast } from "@/components/common/Toast";
import { BackupSecretSheet } from "@/components/settings/BackupSecretSheet";
import { SyncSetupSheet } from "@/components/settings/SyncSetupSheet";
import { type ConnectNext, useDeviceSync } from "@/hooks/useDeviceSync";
import { reportError } from "@/src/reportError";

/**
 * Onboarding's second way back to a hero: from the cloud, rather than from a file. Connecting
 * the server and giving the password is all it asks; the sync that follows finds the other
 * device ahead of this empty one, and components/SyncPrompt.tsx offers to take its version, so
 * no village is built only to be replaced.
 *
 * A server with nothing on it yet is not a way back: the connection is dropped again and the
 * hero is told, rather than left connected with encryption off, which sync refuses.
 */
export function CloudRestoreLink({ disabled }: { disabled: boolean }) {
  const { t } = useTranslation();
  const { showError } = useToast();
  const deviceSync = useDeviceSync();
  const [open, setOpen] = useState(false);
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
      <Text
        testID="onboarding-restore-cloud"
        color="$textSecondary"
        fontSize={15}
        textDecorationLine="underline"
        style={{ textAlign: "center" }}
        opacity={disabled ? 0.5 : 1}
        // `disabled` on a Text is an accessibility flag and does not stop `onPress`.
        onPress={disabled ? undefined : () => setOpen(true)}
      >
        {t("sync.onboardingCta")}
      </Text>
      <SyncSetupSheet
        context="onboarding"
        open={open}
        onClose={() => setOpen(false)}
        onConnectNextcloud={(server) => deviceSync.connect(server).then(follow)}
        onCancelNextcloud={deviceSync.cancelConnect}
        onConnectFolder={() => deviceSync.connectFolder().then(follow)}
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
