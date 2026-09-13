import { useChorusStore } from "@/stores/chorus";

/**
 * Sends the villager on screen away, on any touch, without taking the touch.
 *
 * app/_layout.tsx calls it on the root view's `onStartShouldSetResponderCapture`, which sees every
 * touch on its way down to whatever was tapped. Returning `false` is the half that matters as much
 * as the dismissal: `true` would make the root view the responder for every tap in the app. Its
 * own module because a component file may only export components (fast refresh).
 */
export function dismissVillagerOnTouch(): boolean {
  const { current, dismiss } = useChorusStore.getState();
  if (current) dismiss(current.id);
  return false;
}
