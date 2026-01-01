import { useSettingsStore } from "@/stores/settings";

/**
 * Hook that returns whether reduced motion is enabled.
 * Use this to conditionally disable animations.
 *
 * @example
 * const reducedMotion = useReducedMotion();
 * const animation = reducedMotion ? undefined : "quick";
 * <YStack animation={animation}>...</YStack>
 */
export function useReducedMotion(): boolean {
  return useSettingsStore((s) => s.reducedMotion);
}

/**
 * Returns animation props based on reduced motion preference.
 * If reduced motion is enabled, returns undefined for animation props.
 *
 * @example
 * const animProps = useAnimationProps("quick", { opacity: 0, y: 20 });
 * <YStack {...animProps}>...</YStack>
 */
export function useAnimationProps(
  animation: string = "quick",
  enterStyle?: Record<string, number | string>
) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return {};
  }

  return {
    animation,
    ...(enterStyle ? { enterStyle } : {}),
  };
}
