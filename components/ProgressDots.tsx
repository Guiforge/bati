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
      rounded={5}
      bg={i < current ? "$primary" : "$text"}
      opacity={i < current ? 1 : 0.3}
    />
  ));

  return (
    <XStack gap="$2" justify="center" py="$4">
      {dots}
    </XStack>
  );
}
