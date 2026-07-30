import { useEffect, useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Paragraph, YStack } from "tamagui";
import { Card } from "@/components/common/Card";
import { BOSS_LOW_HP_TAUNTS, BOSS_TAUNTS } from "@/constants/bossTaunts";
import { useSessionStore } from "@/stores/session";
import { useSettingsStore } from "@/stores/settings";

/** Session top padding (16) + header row (~40) + gap (16) + the bounded HUD strip (~76). */
const HUD_BOTTOM_OFFSET = 148;

export function BossTauntOverlay() {
  const bossFight = useSessionStore((s) => s.bossFight);
  const status = useSessionStore((s) => s.status);
  const language = useSettingsStore((s) => s.language);
  const insets = useSafeAreaInsets();
  const [taunt, setTaunt] = useState<string | null>(null);

  // Only show taunts during active parts of the session
  const isActive = status === "running" || status === "countdown";
  const bossFightId = bossFight?.id ?? null;

  // HP changes every exercise (new bossFight object each hit); the taunt schedule must
  // survive that, so live HP is read from a ref instead of the effect's closure.
  const bossFightRef = useRef(bossFight);
  bossFightRef.current = bossFight;

  useEffect(() => {
    if (bossFightId === null || !isActive) {
      setTaunt(null);
      return;
    }

    let hideTimeoutId: ReturnType<typeof setTimeout> | undefined;

    // Randomly show a taunt every 15-45 seconds
    const scheduleNextTaunt = () => {
      const delay = Math.random() * 30000 + 15000;
      return setTimeout(() => {
        const currentFight = bossFightRef.current;
        if (!currentFight) return;
        const isLowHp = currentFight.currentHp / currentFight.totalHp < 0.3;
        const pool = isLowHp ? BOSS_LOW_HP_TAUNTS : BOSS_TAUNTS;
        const messages = pool[language as "en" | "fr"] || pool.en;
        const message = messages[Math.floor(Math.random() * messages.length)];

        setTaunt(message);

        // Hide after 4 seconds
        hideTimeoutId = setTimeout(() => setTaunt(null), 4000);

        // Schedule next
        timeoutId = scheduleNextTaunt();
      }, delay);
    };

    let timeoutId = scheduleNextTaunt();

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(hideTimeoutId);
    };
  }, [bossFightId, isActive, language]);

  if (!taunt) return null;

  return (
    // Anchored just under the boss HUD rather than at a magic `top: 120` that landed on top of
    // it. Non-interactive: a decorative bubble must never swallow a tap aimed at the session.
    <YStack
      position="absolute"
      pointerEvents="none"
      transition="bouncy"
      enterStyle={{ opacity: 0, scale: 0.5, y: -20 }}
      exitStyle={{ opacity: 0, scale: 0.5, y: -20 }}
      style={{ top: insets.top + HUD_BOTTOM_OFFSET, right: 20, zIndex: 1000 }}
    >
      {/* The HUD already shows the boss's real art — the bubble only needs its voice, and its
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
