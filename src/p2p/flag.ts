/**
 * Device-to-device sync reaches a tester only in a dev build, or in a release built with
 * EXPO_PUBLIC_P2P_SYNC=1. The internet meeting (Phase 2) has a flag of its own, so the Wi-Fi
 * phase can ship while the privacy text for relays does not exist yet (PLAN.md, test F3).
 * Literal reads: Babel inlines them, see noDynamicEnvAccess.
 */
export const P2P_SYNC_ENABLED = __DEV__ || process.env.EXPO_PUBLIC_P2P_SYNC === "1";
export const P2P_INTERNET_ENABLED =
  P2P_SYNC_ENABLED && process.env.EXPO_PUBLIC_P2P_INTERNET === "1";
