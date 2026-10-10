import { Stack, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { BackHandler } from "react-native";
import { type BigFeast, BigFeastView } from "@/components/session/BigFeastView";
import { revealShield } from "@/components/session/bigFeastText";
import { goOn, seeVillage } from "@/components/session/destinations";
import { bigFeastOf, feastKey } from "@/components/session/feasts";
import { CrestSheet, type CrestView } from "@/components/village/CrestSheet";
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
function readCrest(set: (crest: Crest | null) => void) {
  getCrest()
    .then(set)
    .catch((e) => {
      reportError("bigFeast.crest", e);
      set(null);
    });
}

export default function BigFeastScreen() {
  const router = useRouter();
  const villageName = useUserStore((s) => s.villageName);
  const finished = useSessionStore((s) => s.status === "finished");
  const result = useSessionStore((s) => s.savedResult);
  // The shown list is read live, not taken from the result (frozen when the session was saved):
  // a feast marked since, by a forged link or a second open, never opens again.
  const [shown, setShown] = useState<string[] | undefined>(undefined);
  const found =
    finished && result && shown ? bigFeastOf({ ...result, bigFeastsShown: shown }) : undefined;
  const feast: BigFeast | null = found && KINDS.includes(found.kind) ? (found as BigFeast) : null;
  const [sessions, setSessions] = useState<number | null | undefined>(undefined);
  const [crest, setCrest] = useState<Crest | null | undefined>(undefined);
  // Leaving quits the session, which empties what this screen reads: it must not leave twice.
  const left = useRef(false);

  useEffect(() => {
    preferences
      .getBigFeastsShown()
      .then(setShown)
      .catch((e) => {
        reportError("bigFeast.shown", e);
        // A tier exists only in the session that crossed it: fall back on the list the victory
        // screen used (frozen at save) rather than close and lose the feast for good.
        setShown(useSessionStore.getState().savedResult?.bigFeastsShown ?? []);
      });
  }, []);

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
    if (isReveal) readCrest(setCrest);
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
  // Until the shown list is read there is no telling, so wait for it.
  useEffect(() => {
    if (feast === null && shown !== undefined && !left.current) {
      left.current = true;
      if (router.canGoBack()) router.back();
      else router.replace("/");
    }
  });

  // The one road out to the village: the button, and a choice of animal (the shield the feast
  // revealed is no longer the hero's, and "Why the Bear?" beside a stag would be a lie).
  const toVillage = () => {
    if (left.current || !result) return;
    left.current = true;
    router.back();
    seeVillage(router, result);
  };

  const [crestView, setCrestView] = useState<CrestView | null>(null);
  const waiting = (isTier && sessions === undefined) || (isReveal && crest === undefined);
  return (
    <>
      {/* No slide: the first beat is two eyes on the painting, and a fade would eat it. Before any
          early return: the push is already animating by the time a figure has arrived. */}
      <Stack.Screen options={{ animation: "none" }} />
      {/* A figure still on its way: say nothing rather than half of it. */}
      <CrestSheet
        view={crestView}
        crest={crest ?? null}
        onView={setCrestView}
        onClose={() => setCrestView(null)}
        onChanged={() => {
          readCrest(setCrest);
          toVillage();
        }}
      />
      {!feast || !result || waiting ? null : (
        <BigFeastView
          feast={feast}
          crest={feast.kind === "reveal" ? revealShield(feast, crest ?? null) : null}
          tier={getVillageTier(calculateLevelFromXp(result.heroXp.after))}
          villageName={villageName}
          sessions={sessions ?? null}
          onWhy={() => setCrestView("why")}
          onSeeVillage={toVillage}
        />
      )}
    </>
  );
}
