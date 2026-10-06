import { Tag, XStack } from "bati-ds";

export const Tones = () => (
  <XStack bg="$bgDark" p="$4" gap="$2" flexWrap="wrap" width={340}>
    <Tag label="3 rounds" />
    <Tag label="Medium" tone="primary" />
    <Tag label="Easy" tone="success" />
    <Tag label="up to +140 XP" textColor="$resourceGold" />
  </XStack>
);
