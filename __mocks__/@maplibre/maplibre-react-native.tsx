import type { ReactNode } from "react";
import { View } from "react-native";

/**
 * MapLibre, for every suite that mounts a screen with a map on it.
 *
 * The renderer is native and jest has none: the commonjs build calls
 * `TurboModuleRegistry.getEnforcing` the moment it is imported, so a screen that merely contains a
 * map fails to load. Jest picks this file up by itself for anything under `node_modules`. A suite
 * that needs to read what the map was handed mocks the package itself, as
 * `__tests__/expedition-recap.test.tsx` and `__tests__/live-map.test.tsx` do, and its factory wins.
 */
const passthrough =
  (testID: string) =>
  ({ children }: { children?: ReactNode }) => <View testID={testID}>{children}</View>;

// `Map` shadows the global of the same name, which is the one thing a file edited later should
// not be surprised by; the export keeps the package's own name.
const MapView = passthrough("maplibre");

export { MapView as Map };
export const Camera = passthrough("maplibre-camera");
export const GeoJSONSource = passthrough("maplibre-source");
export const Layer = passthrough("maplibre-layer");
