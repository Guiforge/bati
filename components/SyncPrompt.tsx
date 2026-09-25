import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";

import { useBackup } from "@/hooks/useBackup";
import { peerScratch } from "@/src/backupFiles";
import { rememberAnswer } from "@/src/deviceSync";
import { reportError } from "@/src/reportError";
import { useSyncStore } from "@/stores/sync";

/**
 * After a sync, offers the one decision it cannot take alone: another device has sessions this
 * one does not. Ahead (it has everything we have, and more) is a hand-off; diverged (each has
 * sessions the other lacks) is a choice, and the copy says what is lost either way. Streaks asks
 * the same question with a conflict picker; Joplin's answer, a "Conflicts" notebook, is the one
 * a game should not copy.
 *
 * An Alert, because it is one question with two answers and it has to reach the hero wherever the
 * launch left them. Asked once per file version: "keep this one" is remembered until that device
 * writes again (`rememberAnswer`), and within a process the store remembers what was offered.
 */
export function SyncPrompt() {
  const { t } = useTranslation();
  const { runAdopt } = useBackup();
  const result = useSyncStore((s) => s.result);
  const offered = useSyncStore((s) => s.offered);
  const markOffered = useSyncStore((s) => s.markOffered);

  useEffect(() => {
    const peer = result?.peers.find(
      (p) =>
        (p.state === "ahead" || p.state === "diverged") && !offered.includes(`${p.name}@${p.etag}`),
    );
    if (!peer || !("comparison" in peer)) return;
    markOffered(`${peer.name}@${peer.etag}`);

    const { peerOnly, localOnly } = peer.comparison;
    const ahead = peer.state === "ahead";
    Alert.alert(
      ahead ? t("sync.aheadTitle") : t("sync.divergedTitle"),
      ahead
        ? t("sync.aheadBody", { count: peerOnly })
        : t("sync.divergedBody", { peerOnly, localOnly }),
      [
        {
          text: t("sync.keep"),
          style: "cancel",
          onPress: () => {
            rememberAnswer(peer).catch((e) => reportError("sync.remember", e));
          },
        },
        { text: t("sync.take"), onPress: () => runAdopt(peerScratch(peer.index, "plain")) },
      ],
    );
  }, [markOffered, offered, result, runAdopt, t]);

  return null;
}
