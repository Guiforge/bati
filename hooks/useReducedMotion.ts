import { useSettingsStore } from "@/stores/settings";

/**
 * Hook that returns whether reduced motion is enabled.
 * Use this to conditionally disable animations.
 *
 * @example
 * const reducedMotion = useReducedMotion();
 * const transition = reducedMotion ? undefined : "quick";
 * <YStack transition={transition}>...</YStack>
 */
export function useReducedMotion(): boolean {
  return useSettingsStore((s) => s.reducedMotion);
}

/**
 * Returns transition props based on reduced motion preference.
 * If reduced motion is enabled, returns undefined for transition props.
 *
 * @example
 * const animProps = useAnimationProps("quick", { opacity: 0, y: 20 });
 * <YStack {...animProps}>...</YStack>
 */
export function useAnimationProps(
  transition: string = "quick",
  enterStyle?: Record<string, number | string>,
) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return {};
  }

  return {
    transition,
    ...(enterStyle ? { enterStyle } : {}),
  };
}
