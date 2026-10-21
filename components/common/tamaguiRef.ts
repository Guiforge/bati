import type { Ref, RefObject } from "react";

/**
 * A ref typed with RN 0.88's instance types (`ScrollViewInstance`, `TextInputInstance`), handed
 * to a Tamagui component. The ref holds that RN instance at runtime.
 *
 * ponytail: Tamagui 2.7 still types its refs with RN's old `ScrollView`/`TextInput` classes, which
 * RN 0.88 types as function components with no methods, so no honest type fits both. Delete this
 * and pass the ref straight through once Tamagui's types follow RN 0.88 (the Tamagui 3 upgrade).
 */
export function tamaguiRef<T>(ref: RefObject<T | null>): Ref<never> {
  return ref as RefObject<null>;
}
