import { useEffect } from "react";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { XStack, YStack } from "tamagui";

type SkeletonProps = {
  height?: number;
  width?: string | number;
  borderRadius?: number;
};

export function Skeleton({ height = 100, width = "100%", borderRadius = 16 }: SkeletonProps) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.7, { duration: 1000 }), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[animatedStyle, { width: width as number | `${number}%`, height }]}>
      <YStack
        bg="$glassBg"
        borderWidth={1}
        borderColor="$borderStrong"
        borderRadius={borderRadius}
        width="100%"
        height="100%"
      />
    </Animated.View>
  );
}

export function SkeletonCard({ height = 200 }: { height?: number }) {
  return (
    <YStack
      bg="$glassBg"
      borderWidth={1}
      borderColor="$borderStrong"
      borderRadius="$4"
      overflow="hidden"
      mb="$3"
    >
      <Skeleton height={height * 0.6} borderRadius={0} />
      <YStack p="$4" gap="$2">
        <Skeleton height={24} width="80%" borderRadius={8} />
        <XStack gap="$2">
          <Skeleton height={28} width={80} borderRadius={8} />
          <Skeleton height={28} width={60} borderRadius={8} />
        </XStack>
        <Skeleton height={16} width="100%" borderRadius={8} />
        <Skeleton height={16} width="90%" borderRadius={8} />
      </YStack>
    </YStack>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  // Generate unique keys for skeleton items
  const skeletonKeys = Array.from({ length: count }, (_, i) => `skeleton-${Date.now()}-${i}`);

  return (
    <YStack gap="$3" p="$4">
      {skeletonKeys.map((key) => (
        <SkeletonCard key={key} />
      ))}
    </YStack>
  );
}

export function SkeletonHeader() {
  return (
    <YStack gap="$2" p="$4">
      <Skeleton height={32} width="60%" borderRadius={8} />
      <Skeleton height={16} width="40%" borderRadius={8} />
    </YStack>
  );
}
