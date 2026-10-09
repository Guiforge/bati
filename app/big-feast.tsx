import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { BackHandler } from "react-native";
import { type BigFeast, BigFeastView } from "@/components/session/BigFeastView";
import { feastKey } from "@/components/session/feasts";
import { countSessions } from "@/db/completed";
import { preferences } from "@/db/preferences";
import type { VillageTier } from "@/db/village";
import { reportError } from "@/src/reportError";
import { useSessionStore } from "@/stores/session";
import { useUserStore } from "@/stores/user";

const KINDS = ["reveal", "tier", "age", "anniversary"];

function parseFeast(raw: string | undefined): BigFeast | null {
  try {
    const feast: unknown = JSON.parse(raw ?? "null");
    const kind = (feast as { kind?: unknown } | null)?.kind;
    return typeof kind === "string" && KINDS.includes(kind) ? (feast as BigFeast) : null;
  } catch (e) {
    reportError("bigFeast.parse", e);
    return null;
  }
}

/**
 * The one big feast of a night, full screen, opened by "Continue" on the victory screen.
 *
 * It marks itself shown the moment it opens, without waiting: a phone shows each once. It ends
 * two ways, both on the road "Continue" would have taken: the back gesture (what `next` is), or
 * its button, which goes to the village by the victory screen's own "see your village" road.
 */
export default function BigFeastScreen() {
  const params = useLocalSearchParams<{
    feast?: string;
    next?: string;
    anchor?: string;
    village?: string;
    tier?: string;
  }>();
  const router = useRouter();
  const villageName = useUserStore((s) => s.villageName);
  const feast = parseFeast(params.feast);
  const [sessions, setSessions] = useState<number | null | undefined>(undefined);

  const id = feast ? feastKey(feast) : null;
  useEffect(() => {
    if (id) preferences.markBigFeastShown(id).catch((e) => reportError("bigFeast.mark", e));
  }, [id]);

  const isTier = feast?.kind === "tier";
  useEffect(() => {
    if (!isTier) return;
    countSessions()
      .then(setSessions)
      .catch((e) => {
        reportError("bigFeast.count", e);
        setSessions(null);
      });
  }, [isTier]);

  const next = params.next ?? "/";
  const close = () => {
    useSessionStore.getState().quitSession();
    if (params.anchor === "1") router.replace(next as never, { withAnchor: true });
    else router.replace(next as never);
  };

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      close();
      return true;
    });
    return () => subscription.remove();
  });

  // Nothing readable to say: go on as Continue would have.
  const unreadable = feast === null;
  useEffect(() => {
    if (unreadable) close();
  });

  // A figure still on its way: say nothing rather than half of it.
  if (!feast || (isTier && sessions === undefined)) return null;

  return (
    <BigFeastView
      feast={feast}
      tier={Number(params.tier) as VillageTier}
      villageName={villageName}
      sessions={sessions ?? null}
      onSeeVillage={() => router.replace((params.village ?? "/") as never)}
    />
  );
}
