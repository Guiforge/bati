import { XStack, YStack } from "tamagui";

interface ProgressDotsProps {
  current: number;
  total: number;
}

export function ProgressDots({ current, total }: ProgressDotsProps) {
  const dots = Array.from({ length: total }).map((_, i) => (
    <YStack
      // biome-ignore lint/suspicious/noArrayIndexKey: Static progress dots, order never changes
      key={i}
      width={i === current - 1 ? 24 : 10}
      height={10}
      borderRadius={5}
      backgroundColor={i < current ? "$primary" : "$color"}
      opacity={i < current ? 1 : 0.3}
      animation="bouncy"
    />
  ));

  return (
    <XStack gap="$2" justifyContent="center" paddingVertical="$4">
      {dots}
    </XStack>
  );
}
