/** Where Bati+ is read from. `none`: no store sells it here, so nothing is sold and everything is open. */
export type EntitlementSource = "play" | "appstore" | "testflight" | "none";
export type Entitlements = { source: EntitlementSource; plus: boolean };

/**
 * The one reader. Every build of this branch has no billing module, so it is `none`.
 * ponytail: constant until P-04.1 adds modules/bati-play-billing/; that module is resolved here
 * (requireOptionalNativeModule) and nowhere else, so access.ts never names a store.
 */
export function readEntitlements(): Entitlements {
  return { source: "none", plus: false };
}
