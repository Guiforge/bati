import { AppIconButton, GameIcon, XStack } from "bati-ds";

export const IconButtons = () => (
  <XStack bg="$bgDark" p="$4" gap="$3">
    <AppIconButton accessibilityLabel="Share">
      <GameIcon name="scroll" size={22} color="#ECE4D4" />
    </AppIconButton>
    <AppIconButton accessibilityLabel="Favourite">
      <GameIcon name="star" size={22} color="#E2B54A" />
    </AppIconButton>
  </XStack>
);
