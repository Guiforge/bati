import { Chip, XStack } from "bati-ds";

export const Tones = () => (
  <XStack bg="$bgDark" p="$4" gap="$2" flexWrap="wrap" width={340}>
    <Chip label="≈ 12 min" />
    <Chip label="Regular" tone="primary" />
    <Chip label="Done" tone="success" />
    <Chip label="+30 XP" textColor="$resourceGold" />
  </XStack>
);
