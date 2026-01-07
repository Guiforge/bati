import { type ColorTokens, XStack, YStack } from "tamagui";
import { useReducedMotion } from "@/src/hooks/useReducedMotion";

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  bg?: ColorTokens;
}

/**
 * A simple skeleton loading placeholder.
 * Respects reduced motion preferences.
 */
export function Skeleton({
  width = "100%",
  height = 20,
  radius = 8,
  bg = "$bgLight",
}: SkeletonProps) {
  const reducedMotion = useReducedMotion();

  return (
    <YStack
      width={width}
      height={height}
      bg={bg}
      rounded={radius}
      opacity={reducedMotion ? 0.5 : 0.7}
    />
  );
}

/**
 * A skeleton card matching the app's card style
 */
export function SkeletonCard({ children }: { children?: React.ReactNode }) {
  return (
    <YStack bg="$bgLight" p="$4" rounded="$6" borderWidth={3} borderColor="$color" gap="$3">
      {children || (
        <>
          <Skeleton height={24} width="60%" />
          <Skeleton height={16} width="80%" />
          <Skeleton height={16} width="40%" />
        </>
      )}
    </YStack>
  );
}

/**
 * A skeleton list item
 */
export function SkeletonListItem() {
  return (
    <XStack gap="$3" items="center" p="$3">
      <Skeleton width={48} height={48} radius={24} />
      <YStack flex={1} gap="$2">
        <Skeleton height={16} width="70%" />
        <Skeleton height={12} width="50%" />
      </YStack>
    </XStack>
  );
}
