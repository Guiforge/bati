import { ProgressBar, Text, YStack } from "bati-ds";

export const SessionProgress = () => (
  <YStack bg="$bgDark" p="$4" gap="$2" width={340}>
    <Text fontSize={12} fontWeight="700" color="$textSecondary">
      ROUND 1 / 3 · EXERCISE 2 / 3
    </Text>
    <ProgressBar progress={33} />
  </YStack>
);

export const OathProgress = () => (
  <YStack bg="$surface" p="$4" gap="$2" width={340}>
    <Text color="$text">20 sessions this season</Text>
    <ProgressBar progress={55} height={8} color="#E2B54A" trackColor="#362C15" />
  </YStack>
);
