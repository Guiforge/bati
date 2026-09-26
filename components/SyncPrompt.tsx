import { reloadAppAsync } from "expo";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, type AlertButton } from "react-native";

import { useToast } from "@/components/common/Toast";
import { BackupSecretSheet } from "@/components/settings/BackupSecretSheet";
import { useBackup } from "@/hooks/useBackup";
import { peerScratch } from "@/src/backupFiles";
import {
  joinPeer,
  keepThisDeviceOnServer,
  mergeWithPeer,
  type Peer,
  rememberAnswer,
  rememberMergeNotice,
  rememberUnreadable,
  takeMergeNotice,
} from "@/src/deviceSync";
import { reportError } from "@/src/reportError";
import { useSessionStore } from "@/stores/session";
import { useSyncStore } from "@/stores/sync";

/**
 * After a sync, what it could not settle alone, one at a time:
 *
 * - **ahead** or **diverged**: merged (`mergeWithPeer`), not asked. What either device recorded
 *   ends up on both, the app reloads so every screen reads the merged database, and a toast says
 *   what arrived. Only a device on another build, which the merge refuses, gets the old question:
 *   take its version (a hand-off when this one has nothing to lose) or keep this one.
 * - **locked**: another device seals with a password this one does not know. Until it is typed
 *   here, the two never see each other, so that is asked instead of staying silent.
 * - **unreadable**: said once. Most often that device runs a newer Bati, and silence would leave
 *   the hero wondering why the tablet's sessions never arrive.
 *
 * Streaks asks the same question with a conflict picker; Joplin's answer, a "Conflicts" notebook,
 * is the one a game should not copy. Never during a session: taking a version unmounts the app,
 * and a set in progress would go with it. Asked once per state: "keep this one" is remembered
 * until that device has news (`rememberAnswer`), and within a process the store remembers what
 * was offered.
 */
export function SyncPrompt() {
  const { t } = useTranslation();
  const { showSuccess } = useToast();
  const { runAdopt } = useBackup();
  const result = useSyncStore((s) => s.result);
  const offered = useSyncStore((s) => s.offered);
  const markOffered = useSyncStore((s) => s.markOffered);
  const run = useSyncStore((s) => s.run);
  const inSession = useSessionStore((s) => s.status !== "idle" && s.status !== "finished");
  const [joining, setJoining] = useState<{ peer: string; wrong: boolean } | null>(null);
  // An alert on screen. `markOffered` re-runs the effect, and without this the next device's
  // question opened on top of the one still being read.
  const [showing, setShowing] = useState(false);

  // Said after the reload a merge ends with: the app vanished for a second, and this is why.
  useEffect(() => {
    takeMergeNotice()
      .then((sessions) => {
        if (sessions === null) return;
        showSuccess(sessions > 0 ? t("sync.merged", { count: sessions }) : t("sync.mergedOther"));
      })
      .catch((e) => reportError("sync.mergeNotice", e));
  }, [showSuccess, t]);

  useEffect(() => {
    if (inSession || joining !== null || showing) return;
    const peer = result?.peers.find(
      (p) =>
        p.state !== "level" &&
        p.state !== "behind" &&
        p.state !== "waiting" &&
        !offered.includes(offerKey(p)),
    );
    if (!peer) return;
    markOffered(offerKey(peer));

    /** Every answer, and a dismissal, frees the screen for the next question. */
    const ask = (title: string, body: string, buttons: AlertButton[]) => {
      setShowing(true);
      const done = () => setShowing(false);
      Alert.alert(
        title,
        body,
        buttons.map((b) => ({
          ...b,
          onPress: () => {
            done();
            b.onPress?.();
          },
        })),
        { onDismiss: done },
      );
    };

    /** The hero's choice, as before the merge existed, for the one case it cannot handle. */
    const offerChoice = (peer: Extract<Peer, { comparison: unknown }>) => {
      const plain = peerScratch(peer.name, "plain");
      const { peerChanges, localChanges } = peer.comparison;
      if (peer.state === "ahead") {
        // Nothing here would be lost, so there is nothing to keep first and no "keep" to remember:
        // "later" only means "not now".
        ask(t("sync.aheadTitle"), t("sync.aheadBody", { count: peerChanges }), [
          { text: t("sync.later"), style: "cancel" },
          { text: t("sync.take"), onPress: () => runAdopt(plain, () => Promise.resolve()) },
        ]);
        return;
      }
      ask(
        t("sync.divergedTitle"),
        t("sync.divergedBody", { peer: peerChanges, local: localChanges }),
        [
          {
            text: t("sync.keep"),
            style: "cancel",
            onPress: () => {
              rememberAnswer(peer).catch((e) => reportError("sync.remember", e));
            },
          },
          { text: t("sync.take"), onPress: () => runAdopt(plain, keepThisDeviceOnServer) },
        ],
      );
    };

    if (peer.state === "unreadable") {
      ask(t("sync.unreadableTitle"), t("sync.unreadableBody"), [
        {
          text: t("common.close"),
          onPress: () => {
            rememberUnreadable(peer).catch((e) => reportError("sync.remember", e));
          },
        },
      ]);
      return;
    }
    if (peer.state === "locked") {
      ask(t("sync.lockedTitle"), t("sync.lockedBody"), [
        { text: t("sync.later"), style: "cancel" },
        { text: t("sync.lockedCta"), onPress: () => setJoining({ peer: peer.name, wrong: false }) },
      ]);
      return;
    }
    if (!("comparison" in peer)) return;

    // Merged, not asked: what either device recorded ends up on both. The question below is only
    // for a device whose build differs, which the merge refuses.
    setShowing(true);
    mergeWithPeer(peer)
      .then(async (outcome) => {
        if (outcome.result === "cannot") {
          setShowing(false);
          offerChoice(peer);
          return;
        }
        if (outcome.changes === 0) {
          setShowing(false);
          return;
        }
        // Every cache and store read the database before the merge: a fresh runtime reads it again.
        await rememberMergeNotice(outcome.sessions);
        await reloadAppAsync("merge");
      })
      .catch((e) => {
        reportError("sync.merge", e);
        setShowing(false);
        offerChoice(peer);
      });
  }, [inSession, joining, showing, markOffered, offered, result, runAdopt, t]);

  const submit = (secret: string) => {
    if (joining === null) return;
    const { peer } = joining;
    joinPeer(peer, secret)
      .then((joined) => {
        if (!joined) {
          setJoining({ peer, wrong: true });
          return;
        }
        setJoining(null);
        showSuccess(t("sync.joined"));
        // Same key on both sides now: this sync reads the other device for what it is. A fresh
        // snapshot, because the one sealed at launch is under the key this phone just left.
        return run({ snapshotFirst: true });
      })
      .catch((e) => {
        reportError("sync.join", e);
        setJoining(null);
      });
  };

  return (
    <BackupSecretSheet
      request={{ open: joining !== null, wrong: joining?.wrong ?? false }}
      title={t("sync.lockedTitle")}
      body={t("sync.lockedSecretBody")}
      onSubmit={submit}
      onCancel={() => setJoining(null)}
    />
  );
}

/** One offer per device and state: news from that device is a new offer, a re-seal is not. */
function offerKey(peer: Peer): string {
  return "comparison" in peer
    ? `${peer.name}@${peer.comparison.fingerprint}`
    : `${peer.name}@${peer.state}`;
}
