import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { LightWeekCard } from "@/components/home/LightWeekCard";
import { type NoticeKind, pickNotice } from "@/components/home/noticeOrder";
import { PasswordCheckCard } from "@/components/home/PasswordCheckCard";
import { ProtectCard } from "@/components/home/ProtectCard";
import { ReminderCard } from "@/components/home/ReminderCard";
import { SyncCard } from "@/components/home/SyncCard";
import { syncNoticeKind } from "@/components/home/syncNoticeKind";
import { UpdateCard } from "@/components/home/UpdateCard";
import { WhatsNewCard } from "@/components/home/WhatsNewCard";
import { SessionRecoveryCard } from "@/components/session/SessionRecoveryCard";
import { lightWeekReason } from "@/db/lightWeek";
import { useSessionRecovery } from "@/hooks/useSessionRecovery";
import { lastMerge, lostSync, syncHealth } from "@/src/deviceSync";
import { passwordCheckDue } from "@/src/passwordReminders";
import { protectCardVisible } from "@/src/protectHero";
import { reminderCardKind } from "@/src/reminders";
import { reportError } from "@/src/reportError";
import { checkForUpdate } from "@/src/updateCheck";
import { hasUnseenNotes, releaseNotes } from "@/src/whatsNew";
import { useSettingsStore } from "@/stores/settings";
import { useSyncStore } from "@/stores/sync";

/**
 * The one notice above Home's scene: the first of `NOTICE_ORDER` that has something to say. Each
 * card keeps its own read and its own dismiss; this only decides who gets the slot, so the
 * silences that three cards used to hand-roll live in one list.
 *
 * `useSessionRecovery` is called here, always mounted, because it also sweeps GPS points that
 * belong to no session: mounting it only while recovery wins would stop that sweep.
 *
 * shortcut: the next notice waits for the next focus after the winner is closed, re-decide on
 * dismiss if testers find the empty slot odd.
 */
export function NoticeSlot() {
  const { recoverableSession, isChecking, recoverSession, finishSession, discardSession } =
    useSessionRecovery();
  const language = useSettingsStore((s) => s.language);
  const updateEnabled = useSettingsStore((s) => s.updateCheckEnabled);
  const waitingPassword = useSyncStore(
    (s) => s.result?.peers.some((p) => p.state === "locked") ?? false,
  );
  const failure = useSyncStore((s) => s.failure);
  const lastSyncAt = useSyncStore((s) => s.lastSyncAt);
  // Null until the first read lands: a loading slot asserts nothing.
  const [present, setPresent] = useState<ReadonlySet<NoticeKind> | null>(null);

  useFocusEffect(
    // biome-ignore lint/correctness/useExhaustiveDependencies: `lastSyncAt` is the signal that a sync run ended, not a value the effect reads.
    useCallback(() => {
      let cancelled = false;
      Promise.all([
        lostSync(),
        syncHealth(),
        lastMerge(),
        hasUnseenNotes(),
        updateEnabled ? checkForUpdate() : null,
        protectCardVisible(),
        reminderCardKind(),
        passwordCheckDue(),
        lightWeekReason(new Date()),
      ])
        .then(([lost, health, merge, notes, update, protect, reminder, password, lightWeek]) => {
          if (cancelled) return;
          const sync = syncNoticeKind({
            lost,
            waitingPassword,
            failure,
            failingSince: health.failingSince,
            merge,
            now: Date.now(),
          });
          const due: [NoticeKind, boolean][] = [
            ["sync", sync !== null],
            ["lightWeek", lightWeek !== null],
            ["whatsNew", notes && releaseNotes(language).length > 0],
            ["update", update !== null],
            ["protect", protect],
            ["reminder", reminder !== null],
            ["passwordCheck", password],
          ];
          setPresent(new Set(due.filter(([, on]) => on).map(([kind]) => kind)));
        })
        .catch((error: unknown) => reportError("notice.slot", error));
      return () => {
        cancelled = true;
      };
    }, [language, updateEnabled, waitingPassword, failure, lastSyncAt]),
  );

  if (present === null) return null;
  const all = new Set(present);
  if (!isChecking && recoverableSession) all.add("recovery");

  switch (pickNotice(all)) {
    case "recovery":
      return recoverableSession ? (
        <SessionRecoveryCard
          session={recoverableSession}
          onRecover={recoverSession}
          onFinish={finishSession}
          onDiscard={discardSession}
        />
      ) : null;
    case "sync":
      return <SyncCard />;
    case "lightWeek":
      return <LightWeekCard />;
    case "whatsNew":
      return <WhatsNewCard />;
    case "update":
      return <UpdateCard />;
    case "protect":
      return <ProtectCard />;
    case "reminder":
      return <ReminderCard />;
    case "passwordCheck":
      return <PasswordCheckCard />;
    case null:
      return null;
  }
}
