import { router } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Paragraph, Text, XStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { X } from "@/components/icons";
import { failureMessage } from "@/hooks/useDeviceSync";
import {
  dismissMergeCard,
  forgetLostSync,
  type LastMerge,
  lastMerge,
  lostSync,
  type SyncHealth,
  syncHealth,
} from "@/src/deviceSync";
import { reportError } from "@/src/reportError";
import { useSyncStore } from "@/stores/sync";

/** Failing for this long, sync stops being a detail of Settings and says so on Home. */
const FAILING_FOR_MS = 3 * 24 * 60 * 60 * 1000;

/** Said once per process: a lost sync is a bug until proven otherwise, and the trail needs it. */
let lostReported = false;

/**
 * Sync's state on Home, when it is something the hero must know: the protection they set up has
 * stopped, is waiting on them, has been failing for days, or has just brought another device's
 * sessions. One card at a time, the most serious first; nothing at all while sync is fine.
 *
 * Settings is where sync is set up, not where anyone looks: a sync that went "Off" by itself was
 * noticed there only by chance (docs/design/audits/2026-09-26-sync-journeys.md, B2).
 */
export function SyncCard() {
  const { t } = useTranslation();
  const waitingPassword = useSyncStore(
    (s) => s.result?.peers.some((p) => p.state === "locked") ?? false,
  );
  const failure = useSyncStore((s) => s.failure);
  const lastSyncAt = useSyncStore((s) => s.lastSyncAt);
  const [lost, setLost] = useState<string | null>(null);
  const [health, setHealth] = useState<SyncHealth | null>(null);
  const [merge, setMerge] = useState<LastMerge | null>(null);

  // Read again after every run: a sync that just failed or just merged changes the answer.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `failure` and `lastSyncAt` are the signal that a run ended, not values the effect reads.
  useEffect(() => {
    Promise.all([lostSync(), syncHealth(), lastMerge()])
      .then(([server, h, m]) => {
        setLost(server);
        setHealth(h);
        setMerge(m);
        if (server !== null && !lostReported) {
          lostReported = true;
          reportError(
            "sync.lost",
            new Error(`Sync with ${server} stopped without the hero asking`),
          );
        }
      })
      .catch((error: unknown) => reportError("sync.card", error));
  }, [failure, lastSyncAt]);

  if (lost !== null) {
    return (
      <SyncNotice
        testID="home-sync-lost"
        title={t("sync.card.lostTitle")}
        body={t("sync.card.lostBody", { server: lost })}
        action={t("sync.card.reconnect")}
        onAction={() => router.push("/settings")}
        onClose={() => {
          setLost(null);
          forgetLostSync().catch((error: unknown) => reportError("sync.forget", error));
        }}
        closeLabel={t("sync.card.forget")}
      />
    );
  }
  if (waitingPassword) {
    return (
      <SyncNotice
        testID="home-sync-waiting"
        title={t("sync.card.waitingTitle")}
        body={t("sync.card.waitingBody")}
        action={t("sync.card.enterPassword")}
        // The question is SyncPrompt's: forgetting it was asked makes it ask again, now.
        onAction={() =>
          useSyncStore.setState((s) => ({
            offered: s.offered.filter((key) => !key.endsWith("@locked")),
          }))
        }
      />
    );
  }
  const failingSince = health?.failingSince ?? null;
  if (failure && failingSince !== null && Date.now() - failingSince > FAILING_FOR_MS) {
    return (
      <SyncNotice
        testID="home-sync-failing"
        title={t("sync.card.failingTitle")}
        body={failureMessage(t, failure)}
        action={t("sync.card.open")}
        onAction={() => router.push("/settings")}
      />
    );
  }
  if (merge !== null && !merge.seen) {
    return (
      <SyncNotice
        testID="home-sync-merged"
        title={t("sync.card.mergedTitle", { count: merge.sessions })}
        body={merge.kept ? t("sync.card.mergedKept") : t("sync.card.mergedBody")}
        onClose={() => {
          setMerge(null);
          dismissMergeCard().catch((error: unknown) => reportError("sync.mergeCard", error));
        }}
        closeLabel={t("common.close")}
      />
    );
  }
  return null;
}

function SyncNotice({
  testID,
  title,
  body,
  action,
  onAction,
  onClose,
  closeLabel,
}: {
  testID: string;
  title: string;
  body: string;
  action?: string;
  onAction?: () => void;
  onClose?: () => void;
  closeLabel?: string;
}) {
  return (
    <Card testID={testID} mx="$4" mt="$3" gap="$3">
      <XStack items="flex-start" gap="$2">
        <Text flex={1} fontSize="$5" fontWeight="700" color="$text">
          {title}
        </Text>
        {onClose ? (
          <Button
            testID={`${testID}-close`}
            size="$2"
            circular
            chromeless
            onPress={onClose}
            icon={<X size={18} color="$textSecondary" />}
            accessibilityRole="button"
            accessibilityLabel={closeLabel}
          />
        ) : null}
      </XStack>
      <Paragraph color="$textSecondary" fontSize="$3">
        {body}
      </Paragraph>
      {action && onAction ? (
        <AppButton testID={`${testID}-action`} variant="outline" onPress={onAction}>
          {action}
        </AppButton>
      ) : null}
    </Card>
  );
}
