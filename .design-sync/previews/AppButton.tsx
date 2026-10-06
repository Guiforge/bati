import { AppButton, YStack } from "bati-ds";

export const Seal = () => (
  <YStack bg="$bgDark" p="$4" width={340}>
    <AppButton>Start the quest</AppButton>
  </YStack>
);

export const Outline = () => (
  <YStack bg="$bgDark" p="$4" width={340}>
    <AppButton variant="outline">See the village</AppButton>
  </YStack>
);

export const DestructiveOutline = () => (
  <YStack bg="$bgDark" p="$4" width={340}>
    <AppButton variant="outline" borderColor="$error">
      Discard this session
    </AppButton>
  </YStack>
);

export const PastTarget = () => (
  <YStack bg="$bgDark" p="$4" width={340}>
    <AppButton backgroundColor="$success">Done</AppButton>
  </YStack>
);

export const Disabled = () => (
  <YStack bg="$bgDark" p="$4" width={340}>
    <AppButton disabled>Saving your session</AppButton>
  </YStack>
);
