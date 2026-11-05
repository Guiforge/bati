/**
 * Nothing of multiplayer reaches a tester until a lot says so: the screens answer only in a dev
 * build, or in a local release built with EXPO_PUBLIC_MULTIPLAYER=1 (R8 and the native bridge fail
 * in ways a dev build cannot show). A literal read: Babel inlines it, see noDynamicEnvAccess.
 */
export const MULTIPLAYER_ENABLED = __DEV__ || process.env.EXPO_PUBLIC_MULTIPLAYER === "1";
