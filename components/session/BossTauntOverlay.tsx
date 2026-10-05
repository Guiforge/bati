import { useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Paragraph, YStack } from "tamagui";
import { Card } from "@/components/common/Card";
import { HUD_HEIGHT, REST_HEADER_HEIGHT } from "@/components/session/sessionArt";
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
  const insets = useSafeAreaInsets();
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

    const lines = pool[language];
    // Modulo a non-empty pool, so always in range; the type does not know that.
    setTaunt(lines[Math.floor(Math.random() * lines.length)] ?? null);

    const id = setTimeout(() => setTaunt(null), TAUNT_MS);
    return () => clearTimeout(id);
  }, [bossFight, lastDamage, isActive, language]);

  if (!taunt || !isActive) return null;

  return (
    // Anchored to the arena's TOP, under the HUD, as if the boss spoke from near its head. It
    // cannot measure the arena — this renders above every session view — and the arena's height is
    // only a floor (it grows into whatever the counter and the CTA leave), so nothing may anchor
    // to its bottom: that is where the name and the HP gauge sit.
    // Non-interactive: a decorative bubble must never swallow a tap aimed at the session.
    <YStack
      position="absolute"
      pointerEvents="none"
      transition={reducedMotion ? undefined : "bouncy"}
      enterStyle={reducedMotion ? undefined : { opacity: 0, scale: 0.5, y: -20 }}
      exitStyle={reducedMotion ? undefined : { opacity: 0, scale: 0.5, y: -20 }}
      style={{
        // Under whatever the screen puts above it, which is not the same thing on the two
        // screens the boss speaks on: the arena while the set runs, the flame header once it is
        // over, because a rest looks the same whether or not a boss is being fought. Neither is
        // measured; both are fixed by construction in `sessionArt.ts`.
        top:
          status === "resting" ? insets.top + REST_HEADER_HEIGHT - 8 : insets.top + HUD_HEIGHT + 16,
        right: 20,
        zIndex: 1000,
      }}
    >
      {/* The arena already shows the boss's real art — the bubble only needs its voice, and its
          tail points back up at the portrait. */}
      <Card
        bg="$surface"
        p="$3"
        rounded="$4"
        borderWidth={1}
        borderColor="$borderStrong"
        maxW={180}
        style={{ borderTopRightRadius: 0 }}
      >
        <Paragraph color="$text" fontWeight="700" fontSize={14}>
          {taunt}
        </Paragraph>
      </Card>
    </YStack>
  );
}
