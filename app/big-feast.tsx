import { Stack, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { BackHandler } from "react-native";
import { type BigFeast, BigFeastView } from "@/components/session/BigFeastView";
import { revealShield } from "@/components/session/bigFeastText";
import { goOn, seeVillage } from "@/components/session/destinations";
import { bigFeastOf, feastKey } from "@/components/session/feasts";
import { countSessions } from "@/db/completed";
import { type Crest, getCrest } from "@/db/crest";
import { preferences } from "@/db/preferences";
import { calculateLevelFromXp } from "@/db/userLevel";
import { getVillageTier } from "@/db/village";
import { reportError } from "@/src/reportError";
import { useSessionStore } from "@/stores/session";
import { useUserStore } from "@/stores/user";

const KINDS = ["reveal", "tier", "age", "anniversary"];

/**
 * The one big feast of a night, full screen, opened by "Continue" on the victory screen.
 *
 * It reads nothing from its link: the feast is whatever the finished session's own result says is
 * big and not yet shown (`bigFeastOf`, the call the victory screen makes), so a forged
 * `bati://big-feast` finds no finished session or no feast and simply closes, marking and quitting
 * nothing. It marks itself shown the moment it opens, without waiting: a phone shows each once.
 * It ends two ways, both the stack "Continue" leaves: the back gesture, or its button, which goes
 * to the village by the victory screen's own "see your village" road.
 */
export default function BigFeastScreen() {
  const router = useRouter();
  const villageName = useUserStore((s) => s.villageName);
  const finished = useSessionStore((s) => s.status === "finished");
  const result = useSessionStore((s) => s.savedResult);
  const found = finished && result ? bigFeastOf(result) : undefined;
  const feast: BigFeast | null = found && KINDS.includes(found.kind) ? (found as BigFeast) : null;
  const [sessions, setSessions] = useState<number | null | undefined>(undefined);
  const [crest, setCrest] = useState<Crest | null | undefined>(undefined);
  // Leaving quits the session, which empties what this screen reads: it must not leave twice.
  const left = useRef(false);

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

  const isReveal = feast?.kind === "reveal";
  useEffect(() => {
    if (!isReveal) return;
    getCrest()
      .then(setCrest)
      .catch((e) => {
        reportError("bigFeast.crest", e);
        setCrest(null);
      });
  }, [isReveal]);

  // Pop this screen, then do what the victory screen would. The two actions queue on one stack,
  // so the session screen under this one is replaced, exactly as "Continue" without a feast did.
  const close = () => {
    if (left.current) return;
    left.current = true;
    if (router.canGoBack()) router.back();
    else router.replace("/");
    if (finished && result) goOn(router, result);
  };

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      close();
      return true;
    });
    return () => subscription.remove();
  });

  // Nothing to say (no finished session, or nothing big left in it): leave, and touch nothing.
  useEffect(() => {
    if (feast === null && !left.current) {
      left.current = true;
      if (router.canGoBack()) router.back();
      else router.replace("/");
    }
  });

  const waiting = (isTier && sessions === undefined) || (isReveal && crest === undefined);
  // A figure still on its way: say nothing rather than half of it.
  if (!feast || !result || waiting) return null;

  return (
    <>
      {/* No slide: the first beat is two eyes on the painting, and a fade would eat it. */}
      <Stack.Screen options={{ animation: "none" }} />
      <BigFeastView
        feast={feast}
        crest={feast.kind === "reveal" ? revealShield(feast, crest ?? null) : null}
        tier={getVillageTier(calculateLevelFromXp(result.heroXp.after))}
        villageName={villageName}
        sessions={sessions ?? null}
        onSeeVillage={() => {
          if (left.current) return;
          left.current = true;
          router.back();
          seeVillage(router, result);
        }}
      />
    </>
  );
}
