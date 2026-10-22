import type { Ref, RefObject } from "react";

/**
 * A ref typed with RN 0.88's `ScrollViewInstance`, handed to a Tamagui ScrollView or
 * Sheet.ScrollView. The ref holds that RN instance at runtime.
 *
 * ponytail: Tamagui 3 types every ScrollView ref as its web one (`HTMLElement & ScrollViewMethods`)
 * on native too, which RN's instance type does not satisfy, so no honest type fits both. Its Input
 * refs follow RN 0.88 (`TextInputInstance`) and go straight through. Delete this once Tamagui's
 * ScrollView ref type is platform-split.
 */
export function tamaguiRef<T>(ref: RefObject<T | null>): Ref<never> {
  return ref as RefObject<null>;
}
