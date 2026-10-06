import { Recitatif, Text, YStack } from "bati-ds";

export const OnArt = () => (
  <YStack bg="$surface2" height={180} width={340} justify="flex-end" p="$3">
    <Recitatif>Chop Wood</Recitatif>
  </YStack>
);

export const WithKicker = () => (
  <YStack bg="$surface2" height={180} width={340} justify="flex-end" p="$3" gap="$2">
    <Text color="$resourceGold" fontSize={13} fontWeight="700" letterSpacing={2}>
      QUEST COMPLETE!
    </Text>
    <Recitatif>The Long Reach</Recitatif>
  </YStack>
);

export const TwoLines = () => (
  <YStack bg="$surface2" height={180} width={260} justify="flex-end" p="$3">
    <Recitatif numberOfLines={2}>The Warden's Round, past the old walls</Recitatif>
  </YStack>
);
