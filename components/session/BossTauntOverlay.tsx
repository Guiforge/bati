import { useEffect, useState } from "react";
import { useWindowDimensions } from "react-native";
import { Paragraph, YStack } from "tamagui";
import { Card } from "@/components/common/Card";
import { sessionArtHeight } from "@/components/session/sessionArt";
import { bossVoice } from "@/constants/bosses";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useSessionStore } from "@/stores/session";
import { useSettingsStore } from "@/stores/settings";
import { getHpPercent, getPhaseFromHp } from "./bossPhase";

/** How long a line stays up before the boss goes quiet again. */
const TAUNT_MS = 4000;

export function BossTauntOverlay() {
  const bossFight = useSessionStore((s) => s.bossFight);
  const lastDamage = useSessionStore((s) => s.lastDamageResult);
  const status = useSessionStore((s) => s.status);
  const language = useSettingsStore((s) => s.language);
  const reducedMotion = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const [taunt, setTaunt] = useState<string | null>(null);

  const isActive = status === "running" || status === "resting";

  // The boss speaks when it is hit, not when a timer says so.
  //
  // It used to fire on a random 15-45 s schedule from one ten-line pool shared by all six bosses,
  // which meant it talked over your set about nothing in particular. `lastDamageResult` already
  // changes identity on exactly the moments worth reacting to, so the whole scheduler goes away
  // and the pool is chosen by what just happened.
  useEffect(() => {
    if (!bossFight || !isActive || !lastDamage || lastDamage.damage <= 0) return;

    const voice = bossVoice(bossFight.imagePath);
    const phase = getPhaseFromHp(getHpPercent(lastDamage.newHp, bossFight.totalHp));

    // Order is deliberate: a cornered boss answers its own state before it answers your hit.
    const pool =
      phase === 4
        ? voice.enrage
        : lastDamage.isCritical
          ? voice.crit
          : lastDamage.resistancePenalty
            ? voice.resist
            : voice.idle;

    const lines = language === "fr" ? pool.fr : pool.en;
    // Modulo a non-empty pool, so always in range; the type does not know that.
    setTaunt(lines[Math.floor(Math.random() * lines.length)] ?? null);

    const id = setTimeout(() => setTaunt(null), TAUNT_MS);
    return () => clearTimeout(id);
  }, [bossFight, lastDamage, isActive, language]);

  if (!taunt || !isActive) return null;

  return (
    // Anchored to the arena's bottom edge. It cannot measure the arena — this renders above every
    // session view — but the arena starts at y=0 in both the running and the resting screen and is
    // sized by one pure function of the window, so the edge is knowable from here.
    // Non-interactive: a decorative bubble must never swallow a tap aimed at the session.
    <YStack
      position="absolute"
      pointerEvents="none"
      transition={reducedMotion ? undefined : "bouncy"}
      enterStyle={reducedMotion ? undefined : { opacity: 0, scale: 0.5, y: -20 }}
      exitStyle={reducedMotion ? undefined : { opacity: 0, scale: 0.5, y: -20 }}
      style={{ top: sessionArtHeight(width, height, "boss") - 8, right: 20, zIndex: 1000 }}
    >
      {/* The arena already shows the boss's real art — the bubble only needs its voice, and its
          tail points back up at the portrait. */}
      <Card
        bg="$surface"
        p="$3"
        rounded="$4"
        borderWidth={1}
        borderColor="$borderStrong"
        maxW={220}
        style={{ borderTopRightRadius: 0 }}
      >
        <Paragraph color="$text" fontWeight="700" fontSize={14}>
          {taunt}
        </Paragraph>
      </Card>
    </YStack>
  );
}
