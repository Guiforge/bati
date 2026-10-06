import { InkGauge, Text, YStack } from "bati-ds";

export const BossHp = () => (
  <YStack bg="$bgDark" p="$4" gap="$2" width={340}>
    <Text fontFamily="$heading" fontWeight="700" fontSize={20} color="$text">
      Nightcoil
    </Text>
    <InkGauge progress={0.62} fill="$primaryText" figure="263 / 425" testIDPrefix="boss" trail={0.7} />
  </YStack>
);

export const LevelEarned = () => (
  <YStack bg="$surface" p="$4" gap="$2" width={340}>
    <Text fontWeight="700" color="$text">
      Level 44 · Divine
    </Text>
    <InkGauge
      progress={0.68}
      fill="$resourceGold"
      track="$gold800"
      figure="1,363 / 2,000 XP"
      figureColor="$resourceGold"
      testIDPrefix="level"
    />
  </YStack>
);
