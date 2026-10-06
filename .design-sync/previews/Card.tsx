import { Card, SectionLabel, Text, YStack } from "bati-ds";

export const Panel = () => (
  <YStack bg="$bgDark" p="$4" width={360}>
    <Card gap="$2">
      <SectionLabel>Next to build</SectionLabel>
      <Text fontFamily="$heading" fontWeight="700" fontSize={20} color="$text">
        Dragon Lair
      </Text>
      <Text color="$textSecondary">Built by your first boss win</Text>
    </Card>
  </YStack>
);

export const HeroPanel = () => (
  <YStack bg="$bgDark" p="$4" width={360}>
    <Card borderWidth={1.5} gap="$2">
      <SectionLabel>Village tier</SectionLabel>
      <Text color="$resourceGold" fontWeight="700">
        Ironhold is complete
      </Text>
      <Text color="$textSecondary">Muscles, styles, upgrades and starters: all at their ceiling.</Text>
    </Card>
  </YStack>
);
