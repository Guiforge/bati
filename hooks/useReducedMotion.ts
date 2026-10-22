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
 * <YStack {...animProps}>...</YStack>  // transition="quick" opacity="enter:0" y="enter:20px"
 *
 * Each entry becomes an `enter:` clause on its own property. The caller's element must not set
 * one of those properties itself: its prop would replace the clause instead of merging with it.
 */
export function useAnimationProps(transition: string = "quick", enter?: Record<string, number>) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return {};
  }

  const clauses: Record<string, string> = {};
  for (const [key, value] of Object.entries(enter ?? {})) {
    // A bare number in a program is a token where the property has a scale: lengths say `px`.
    clauses[key] = `enter:${value}${UNITLESS.has(key) ? "" : "px"}`;
  }
  return { transition, ...clauses };
}

const UNITLESS = new Set(["opacity", "scale", "scaleX", "scaleY", "zIndex"]);
