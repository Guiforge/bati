import { reloadAppAsync } from "expo";
import { type Href, router, usePathname } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useToast } from "@/components/common/Toast";
import { useConfirmDialog } from "@/components/common/useConfirmDialog";
import { BackupSecretSheet } from "@/components/settings/BackupSecretSheet";
import { useBackup } from "@/hooks/useBackup";
import { peerScratch } from "@/src/backupFiles";
import { failureOf } from "@/src/cloudSync";
import {
  announcedPeers,
  joinPeer,
  keepThisDeviceOnServer,
  mergeWithPeer,
  type Peer,
  rememberAnnounced,
  rememberAnswer,
  rememberMergeNotice,
  rememberUnreadable,
  takeMergeNotice,
} from "@/src/deviceSync";
import { bestVaultFirst } from "@/src/joinOrder";
import { reportError } from "@/src/reportError";
import { failureMessage, syncAgo } from "@/src/syncWords";
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
/** Peers that ask nothing of the hero: in step, behind, waiting on this device, or a vault left. */
const NEEDS_NOTHING = new Set<Peer["state"]>(["level", "behind", "waiting", "oldKey"]);

/** News that is only ever said: a newer version on the other device, an unreadable file, an older copy set aside. */
const SAID_ONCE = new Set<Peer["state"]>(["unreadable", "newerVersion", "replayed"]);

export function SyncPrompt() {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const { runAdopt, dialog: backupDialog } = useBackup();
  const result = useSyncStore((s) => s.result);
  const offered = useSyncStore((s) => s.offered);
  const markOffered = useSyncStore((s) => s.markOffered);
  const run = useSyncStore((s) => s.run);
  const inSession = useSessionStore((s) => s.status !== "idle" && s.status !== "finished");
  const [joining, setJoining] = useState<{ peer: string; wrong: boolean } | null>(null);
  // What was already said about which version of which file (read once; the sync sheet ignores it).
  const [announced, setAnnounced] = useState<Record<string, string> | null>(null);
  useEffect(() => {
    announcedPeers()
      .then(setAnnounced)
      .catch((e) => {
        reportError("sync.announced", e);
        setAnnounced({});
      });
  }, []);
  // An alert on screen. `markOffered` re-runs the effect, and without this the next device's
  // question opened on top of the one still being read.
  const [showing, setShowing] = useState(false);
  const { ask: openDialog, dialog } = useConfirmDialog();
  const pathname = usePathname();

  // Said after the reload a merge ends with: the app vanished for a second, and this is why. And
  // the hero goes back where they were: a reload lands on Home, and from Settings that read as
  // being thrown out.
  useEffect(() => {
    takeMergeNotice()
      .then((notice) => {
        if (notice === null) return;
        const { sessions, returnTo } = notice;
        showSuccess(sessions > 0 ? t("sync.merged", { count: sessions }) : t("sync.mergedOther"));
        if (returnTo !== "/") router.push(returnTo as Href);
      })
      .catch((e) => reportError("sync.mergeNotice", e));
  }, [showSuccess, t]);

  /**
   * Every answer, and a dismissal, frees the screen for the next question. The cancel-styled
   * button is the dialog's cancel, the other one its confirm; a single button is a message.
   * Hardware back answers nothing: "keep" and "not mine" are remembered for good, and a back
   * press is not the hero choosing them (the native alert ignored back altogether).
   */
  const ask = (title: string, body: string, buttons: AskButton[]) => {
    setShowing(true);
    const done = () => setShowing(false);
    const cancel = buttons.length > 1 ? buttons.find((b) => b.cancel) : undefined;
    const main = buttons.find((b) => b !== cancel);
    if (!main) return;
    openDialog({
      title,
      body,
      confirmLabel: main.text,
      cancelLabel: cancel?.text,
      onConfirm: () => {
        done();
        main.onPress?.();
      },
      onCancel: () => {
        done();
        cancel?.onPress?.();
      },
      onDismiss: done,
    });
  };

  /** Said once per file: most often that device runs a newer Bati. */
  const announceUnreadable = (peer: Peer) =>
    ask(t("sync.unreadableTitle"), t("sync.unreadableBody"), [
      {
        text: t("common.close"),
        onPress: () => {
          rememberUnreadable(peer).catch((e) => reportError("sync.remember", e));
        },
      },
    ]);

  /** Another device's vault: its password, or nothing is exchanged with it. */
  const offerJoin = (peer: Peer) => {
    const when = peer.modified ? syncAgo(t, peer.modified) : t("sync.status.unknownWhen");
    ask(t("sync.lockedTitle"), t("sync.lockedBody", { when }), [
      { text: t("sync.later"), cancel: true },
      { text: t("sync.lockedCta"), onPress: () => setJoining({ peer: peer.name, wrong: false }) },
    ]);
  };

  /** The hero's choice, as before the merge existed, for the one case it cannot handle. */
  const offerChoice = (peer: ComparedPeer) => {
    const plain = peerScratch(peer.name, "plain");
    const { peerChanges, localChanges } = peer.comparison;
    if (peer.state === "ahead") {
      // "Ahead" compares sessions and hero content only. What only this device keeps (campaign progress,
      // boss fights, quest settings, favourites, the set-aside list) is replaced by the take, so a copy of
      // this device goes to the server first, as when the two diverged, and the dialog says what is replaced.
      // There is no "keep" to remember: "later" only means "not now".
      ask(t("sync.aheadTitle"), t("sync.aheadBody", { count: peerChanges }), [
        { text: t("sync.later"), cancel: true },
        {
          text: t("sync.take"),
          onPress: () => runAdopt(plain, () => keepThisDeviceOnServer().then(() => undefined)),
        },
      ]);
      return;
    }
    ask(
      t("sync.divergedTitle"),
      t("sync.divergedBody", { peer: peerChanges, local: localChanges }),
      [
        {
          text: t("sync.keep"),
          cancel: true,
          onPress: () => {
            rememberAnswer(peer).catch((e) => reportError("sync.remember", e));
          },
        },
        {
          text: t("sync.take"),
          onPress: () => runAdopt(plain, () => keepThisDeviceOnServer().then(() => undefined)),
        },
      ],
    );
  };

  /**
   * Merged, not asked: what either device recorded ends up on both. The question above is only
   * for a device whose build differs, which the merge refuses.
   */
  const merge = (peer: ComparedPeer) => {
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
        await rememberMergeNotice(pathname);
        await reloadAppAsync("merge");
      })
      .catch((e) => {
        reportError("sync.merge", e);
        setShowing(false);
        offerChoice(peer);
      });
  };

  /**
   * A device with nothing of its own yet (a new tablet) is shown whose hero it found before it
   * takes it: recognising "Hautecombe, 16 sessions" is what tells the hero it worked, and a file
   * left on the server by someone else's phone is not taken on faith.
   */
  const offerFound = (peer: ComparedPeer) => {
    const { peerVillage, peerOnly, peerLatest } = peer.comparison;
    const when = peerLatest === null ? t("sync.status.unknownWhen") : syncAgo(t, peerLatest * 1000);
    ask(
      t("sync.found.title"),
      t("sync.found.body", {
        village: peerVillage ?? t("sync.found.unnamed"),
        count: peerOnly,
        when,
      }),
      [
        {
          text: t("sync.found.notMine"),
          cancel: true,
          onPress: () => {
            rememberAnswer(peer).catch((e) => reportError("sync.remember", e));
          },
        },
        { text: t("sync.found.mine"), onPress: () => merge(peer) },
      ],
    );
  };

  /** What to ask or do about one peer. */
  const answer = (peer: Peer) => {
    if (SAID_ONCE.has(peer.state)) {
      // Said, so said once for this version of that file: not again at every launch until the app is updated.
      const key = `${peer.state}@${peer.etag}`;
      setAnnounced((now) => ({ ...(now ?? {}), [peer.name]: key }));
      rememberAnnounced(peer).catch((e) => reportError("sync.announced", e));
    }
    if (peer.state === "replayed") showSuccess(t("sync.replayedToast"));
    else if (peer.state === "unreadable" || peer.state === "newerVersion") announceUnreadable(peer);
    else if (peer.state === "locked") offerJoin(peer);
    else if (!("comparison" in peer)) return;
    else if (peer.comparison.localSessions === 0 && peer.comparison.peerOnly > 0) offerFound(peer);
    else merge(peer);
  };

  // No dependency list: the helpers above are new on every render, and the guards (a question
  // on screen, a session running, an offer already made) are what keep this from asking twice.
  useEffect(() => {
    if (inSession || joining !== null || showing || announced === null) return;
    // Best vault first: with two devices to join, the hero is asked about the one the other will
    // end up joining as well.
    const peer = bestVaultFirst(result?.peers ?? []).find(
      (p) =>
        !NEEDS_NOTHING.has(p.state) &&
        !offered.includes(offerKey(p)) &&
        !(SAID_ONCE.has(p.state) && announced[p.name] === `${p.state}@${p.etag}`),
    );
    if (!peer) return;
    markOffered(offerKey(peer));
    answer(peer);
  });

  const submit = (secret: string) => {
    if (joining === null) return;
    const { peer } = joining;
    return joinPeer(peer, secret)
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
        // It closed on nothing before: a sheet that vanishes reads as success.
        showError(failureMessage(t, failureOf(e)));
      });
  };

  return (
    <>
      {dialog}
      {backupDialog}
      <BackupSecretSheet
        request={{ open: joining !== null, wrong: joining?.wrong ?? false }}
        title={t("sync.lockedTitle")}
        body={t("sync.lockedSecretBody")}
        submitLabel={t("sync.useThisPassword")}
        forgotHint={t("sync.secretForgot")}
        onSubmit={submit}
        onCancel={() => setJoining(null)}
      />
    </>
  );
}

type AskButton = { text: string; cancel?: boolean; onPress?: () => void };

type ComparedPeer = Extract<Peer, { comparison: unknown }>;

/** One offer per device and state: news from that device is a new offer, a re-seal is not. */
function offerKey(peer: Peer): string {
  return "comparison" in peer
    ? `${peer.name}@${peer.comparison.fingerprint}`
    : `${peer.name}@${peer.state}`;
}
