import { useEffect, useState } from "react";
import { Paragraph, XStack, YStack } from "tamagui";
import { Card } from "@/components/common/Card";
import { BOSS_LOW_HP_TAUNTS, BOSS_TAUNTS } from "@/constants/bossTaunts";
import { useSessionStore } from "@/stores/session";
import { useSettingsStore } from "@/stores/settings";

export function BossTauntOverlay() {
  const bossFight = useSessionStore((s) => s.bossFight);
  const status = useSessionStore((s) => s.status);
  const language = useSettingsStore((s) => s.language);
  const [taunt, setTaunt] = useState<string | null>(null);

  // Only show taunts during active parts of the session
  const isActive = status === "running" || status === "countdown";

  useEffect(() => {
    if (!bossFight || !isActive) {
      setTaunt(null);
      return;
    }

    // Randomly show a taunt every 15-45 seconds
    const scheduleNextTaunt = () => {
      const delay = Math.random() * 30000 + 15000;
      return setTimeout(() => {
        const isLowHp = bossFight.currentHp / bossFight.totalHp < 0.3;
        const pool = isLowHp ? BOSS_LOW_HP_TAUNTS : BOSS_TAUNTS;
        const messages = pool[language as "en" | "fr"] || pool.en;
        const message = messages[Math.floor(Math.random() * messages.length)];

        setTaunt(message);

        // Hide after 4 seconds
        setTimeout(() => setTaunt(null), 4000);

        // Schedule next
        timeoutId = scheduleNextTaunt();
      }, delay);
    };

    let timeoutId = scheduleNextTaunt();

    return () => clearTimeout(timeoutId);
  }, [bossFight, isActive, language]);

  if (!taunt) return null;

  return (
    <YStack
      position="absolute"
      animation="bouncy"
      enterStyle={{ opacity: 0, scale: 0.5, y: -20 }}
      exitStyle={{ opacity: 0, scale: 0.5, y: -20 }}
      style={{ top: 120, right: 20, zIndex: 1000 }}
    >
      <XStack items="flex-end" gap="$2">
        {/* Comic Bubble */}
        <Card
          bg="$surface"
          p="$3"
          rounded="$4"
          borderWidth={1}
          borderColor="$borderStrong"
          maxW={200}
          style={{ borderBottomRightRadius: 0 }} // Speech bubble tail effect
        >
          <Paragraph color="$text" fontWeight="bold" fontSize={14}>
            {taunt}
          </Paragraph>
        </Card>

        {/* Boss Avatar Placeholder */}
        <YStack
          width={60}
          height={60}
          bg="$primary"
          rounded="$10"
          borderWidth={1}
          borderColor="$borderStrong"
          overflow="hidden"
          items="center"
          justify="center"
        >
          <Paragraph fontSize={30}>👹</Paragraph>
        </YStack>
      </XStack>
    </YStack>
  );
}
