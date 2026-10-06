import { GameIcon, XStack } from "bati-ds";

export const Glyphs = () => (
  <XStack bg="$bgDark" p="$4" gap="$3" flexWrap="wrap" width={340}>
    <GameIcon name="sword" size={32} color="#F08A4B" />
    <GameIcon name="trophy" size={32} color="#E2B54A" />
    <GameIcon name="shield" size={32} color="#A89C88" />
    <GameIcon name="castle" size={32} color="#ECE4D4" />
    <GameIcon name="flame" size={32} color="#F08A4B" />
  </XStack>
);

export const Framed = () => (
  <XStack bg="$bgDark" p="$4" gap="$3" width={340}>
    <GameIcon name="crown" size={40} color="#E2B54A" bgColor="$surface2" shape="circle" />
    <GameIcon
      name="scroll"
      size={40}
      color="#ECE4D4"
      bgColor="$surface2"
      shape="rounded"
      badge="star"
      badgeColor="#E2B54A"
    />
  </XStack>
);
