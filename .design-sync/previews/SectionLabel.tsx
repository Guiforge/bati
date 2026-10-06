import { SectionLabel, Text, YStack } from "bati-ds";

export const Labels = () => (
  <YStack bg="$bgDark" p="$4" gap="$3" width={340}>
    <SectionLabel>Quick actions</SectionLabel>
    <SectionLabel>To beat next time</SectionLabel>
    <YStack gap="$1">
      <SectionLabel>Your numbers</SectionLabel>
      <Text color="$text">Record 25 reps · Nov 18, 2023</Text>
    </YStack>
  </YStack>
);
