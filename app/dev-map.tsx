// `Map` is MapLibre's map component and shadows the global of the same name; aliased rather
// than ignored, because a file that redefines `Map` is a trap for whoever edits it next.
import { Camera, GeoJSONSource, Layer, Map as MapLibreMap } from "@maplibre/maplibre-react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Text, XStack, YStack } from "tamagui";
import { ChevronLeft } from "@/components/icons";
import { rawColors } from "@/constants/rawColors";

// Spike, not a screen. It answers one question the design doc could not answer on paper: does
// MapLibre render on this React Native + Fabric combination, and what does its native library
// cost the APK. Both halves of review decision 8A in docs/designs/gps-without-google.md.
//
// It will not draw a basemap in this build, and that is correct: INTERNET is still in
// `blockedPermissions`, so no tile ever arrives. What renders is the polyline below, drawn from
// coordinates in the bundle — which is the half that proves the renderer works. The basemap
// half waits for the deliberate permission change, which lands with the lint plugin that keeps
// "one screen, one host" from being a promise nobody enforces.
//
// Delete this file once the recap screen exists.

const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

// A few hundred metres along the Garonne, as a stand-in for a session trace.
const TRACE: GeoJSON.Feature<GeoJSON.LineString> = {
  type: "Feature",
  properties: {},
  geometry: {
    type: "LineString",
    coordinates: [
      [1.4437, 43.6045],
      [1.4451, 43.6039],
      [1.4468, 43.6031],
      [1.4482, 43.602],
      [1.4491, 43.6006],
    ],
  },
};

export default function DevMapSpike() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState("loading…");

  if (!__DEV__) return null;

  return (
    <YStack flex={1} bg="$background" pt={insets.top}>
      <XStack px="$4" py="$3" items="center" gap="$3">
        <Button
          size="$3"
          circular
          chromeless
          onPress={() => router.back()}
          icon={<ChevronLeft size={24} color="$text" />}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        />
        <Text fontSize={20} fontWeight="700" color="$text">
          MapLibre spike
        </Text>
      </XStack>

      <Text px="$4" pb="$2" fontSize="$2" color="$textSecondary">
        {status} — no basemap until INTERNET is unblocked; the line is what proves the renderer.
      </Text>

      <MapLibreMap
        style={{ flex: 1 }}
        mapStyle={STYLE_URL}
        onDidFinishLoadingMap={() => setStatus("map loaded")}
        onDidFailLoadingMap={() => setStatus("style failed (expected: no network)")}
      >
        <Camera center={[1.4464, 43.6026]} zoom={14} />
        {/* biome-ignore lint/correctness/useUniqueElementIds: MapLibre source and layer ids are
            its own style namespace, not DOM ids — a layer finds its source by this exact string. */}
        <GeoJSONSource id="trace" data={TRACE}>
          {/* biome-ignore lint/correctness/useUniqueElementIds: same MapLibre style namespace */}
          <Layer
            id="trace-line"
            type="line"
            style={{ lineColor: rawColors.warning, lineWidth: 4, lineCap: "round" }}
          />
        </GeoJSONSource>
      </MapLibreMap>
    </YStack>
  );
}
