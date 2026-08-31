// `Map` is MapLibre's map component and shadows the global of the same name; aliased rather than
// ignored, because a file that redefines `Map` is a trap for whoever edits it next.
import { Camera, GeoJSONSource, Layer, Map as MapLibreMap } from "@maplibre/maplibre-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, XStack, YStack } from "tamagui";
import { AppIconButton } from "@/components/common/AppButton";
import { ChevronLeft } from "@/components/icons";
import { formatDistance, formatPace } from "@/constants/distanceFormat";
import { MAP_ATTRIBUTION, mapStyle } from "@/constants/mapStyle";
import { rawColors } from "@/constants/rawColors";
import { formatDuration } from "@/db/estimate";
import { pointsOf } from "@/db/gps";
import type { LocationFix } from "@/modules/bati-location";
import { toTrace } from "@/src/gps/trace";
import { accept, EMPTY } from "@/src/gps/track";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";

/**
 * What an expedition looks like when it is over: the ground covered, and the three numbers that
 * ground is worth.
 *
 * The map is the screen rather than a panel on it — `$bgDark` ground, no border, no card, fading
 * into the page at top and bottom, camera locked to this run's bounds with every gesture off. A
 * recap map you can pan is a map you can pan into the next town, which is where a road map lives.
 * Locked, it is a picture of this outing. See docs/designs/map-immersion.md.
 *
 * Nothing here recomputes anything. The fixes are folded through `accept`, the same reducer that
 * read them live, and every distance and pace goes through `constants/distanceFormat.ts` — the
 * two rules that keep one run from having two different lengths.
 */

/** Where the outing began and where it ended, as the map's only two other lit points. */
function endpoints(
  start: [number, number] | null,
  end: [number, number] | null,
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  const pip = (coordinates: [number, number], kind: string): GeoJSON.Feature<GeoJSON.Point> => ({
    type: "Feature",
    properties: { kind },
    geometry: { type: "Point", coordinates },
  });
  return {
    type: "FeatureCollection",
    features: [...(start ? [pip(start, "start")] : []), ...(end ? [pip(end, "end")] : [])],
  };
}

function Figure({ label, value, testID }: { label: string; value: string; testID: string }) {
  return (
    <YStack flex={1} gap="$1" items="center">
      {/* DESIGN.md's "label" recipe: short, uppercase, wide tracking — never body text. */}
      <Text fontSize={11} letterSpacing={2} color="$textSecondary" textTransform="uppercase">
        {label}
      </Text>
      <Text testID={testID} fontSize={22} fontWeight="700" color="$text">
        {value}
      </Text>
    </YStack>
  );
}

export default function ExpeditionRecapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ session?: string | string[] }>();
  const distanceUnit = useSettingsStore((s) => s.distanceUnit);

  const sessionUuid = Array.isArray(params.session) ? params.session[0] : params.session;

  // `null` while the points are still on their way. An empty array is an answer — "this quest
  // never left the walls" — and the two must not render the same thing.
  const [fixes, setFixes] = useState<LocationFix[] | null>(null);

  const load = useCallback(async (uuid: string) => {
    setFixes(await pointsOf(uuid));
  }, []);

  useEffect(() => {
    if (!sessionUuid) {
      setFixes([]);
      return;
    }
    load(sessionUuid).catch((e) => {
      reportError("recap.points", e);
      setFixes([]);
    });
  }, [sessionUuid, load]);

  // The reducer is the only thing that knows what a stream of fixes means: which metres were
  // walked and which were a phone drifting on a bench. Summing `distFromPrev` here would invent
  // half a kilometre over a long stop and quietly disagree with the live screen.
  const track = (fixes ?? []).reduce(accept, EMPTY);
  const trace = toTrace(fixes ?? []);

  const header = (
    <XStack items="center" gap="$3" px="$5" pt={insets.top + 12} pb="$3">
      <AppIconButton
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel={t("common.go_back", "Go back")}
      >
        <ChevronLeft size={22} color="$text" strokeWidth={2.5} />
      </AppIconButton>
      <Text fontWeight="700" fontSize={20} color="$text">
        {t("recap.title", "The ground covered")}
      </Text>
    </XStack>
  );

  return (
    // `$bgDark` and not `$background`: the theme background is translucent over the app's city
    // illustration, and the map's ground is opaque `bgDark`. Painting the page in anything else
    // draws exactly the rectangle edge this whole design exists to remove.
    <YStack testID="expedition-recap-screen" flex={1} bg="$bgDark">
      {header}

      <YStack flex={1}>
        {trace.bounds === null ? (
          // No fixes, which is every strength quest ever logged. An empty basemap centred on
          // nowhere is worse than no map: it says the trace was lost when there never was one.
          <YStack flex={1} items="center" justify="center" px="$6">
            <Text
              testID="recap-no-trace"
              fontSize={15}
              color="$textSecondary"
              style={{ textAlign: "center" }}
            >
              {fixes === null
                ? t("common.loading", "Loading...")
                : t("recap.no_trace", "This quest never left the walls.")}
            </Text>
          </YStack>
        ) : (
          <YStack flex={1} testID="recap-map">
            <MapLibreMap
              style={{ flex: 1 }}
              mapStyle={mapStyle}
              // The credit is our own line under the map, in the app's type — which is exactly
              // what OpenFreeMap asks of a client that switches its widget off.
              attribution={false}
              logo={false}
              compass={false}
              dragPan={false}
              touchZoom={false}
              touchRotate={false}
              touchPitch={false}
              doubleTapZoom={false}
            >
              <Camera
                bounds={trace.bounds}
                padding={{ top: 48, right: 24, bottom: 48, left: 24 }}
              />

              {/* biome-ignore lint/correctness/useUniqueElementIds: MapLibre source and layer ids
                  are its own style namespace, not DOM ids — a layer finds its source by this
                  exact string. */}
              <GeoJSONSource id="trace" data={trace.line}>
                {/* The glow is the same gold at low opacity behind a wide blur, so it needs no
                    colour of its own. Everything else on this map sits between 4% and 15%
                    lightness; the trace is the only lit thing on the screen. */}
                {/* biome-ignore lint/correctness/useUniqueElementIds: same MapLibre namespace */}
                <Layer
                  id="trace-glow"
                  type="line"
                  layout={{ "line-cap": "round", "line-join": "round" }}
                  paint={{
                    "line-color": rawColors.resourceGold,
                    "line-width": 14,
                    "line-opacity": 0.18,
                    "line-blur": 12,
                  }}
                />
                {/* biome-ignore lint/correctness/useUniqueElementIds: same MapLibre namespace */}
                <Layer
                  id="trace-line"
                  type="line"
                  layout={{ "line-cap": "round", "line-join": "round" }}
                  paint={{ "line-color": rawColors.resourceGold, "line-width": 4 }}
                />
              </GeoJSONSource>

              {/* biome-ignore lint/correctness/useUniqueElementIds: same MapLibre namespace */}
              <GeoJSONSource id="trace-ends" data={endpoints(trace.start, trace.end)}>
                {/* biome-ignore lint/correctness/useUniqueElementIds: same MapLibre namespace */}
                <Layer
                  id="trace-pips"
                  type="circle"
                  paint={{
                    "circle-radius": 5,
                    "circle-color": [
                      "match",
                      ["get", "kind"],
                      "start",
                      rawColors.success,
                      rawColors.resourceFire,
                    ],
                    "circle-stroke-width": 2,
                    "circle-stroke-color": rawColors.bgDark,
                  }}
                />
              </GeoJSONSource>
            </MapLibreMap>

            {/* The vignette: the map fades into the page instead of ending at an edge. Two
                gradients rather than a paper texture, which would need a sprite this style
                deliberately does not serve. */}
            <LinearGradient
              colors={[rawColors.bgDark, "transparent"]}
              style={{ position: "absolute", top: 0, left: 0, right: 0, height: 56 }}
              pointerEvents="none"
            />
            <LinearGradient
              colors={["transparent", rawColors.bgDark]}
              style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 56 }}
              pointerEvents="none"
            />
          </YStack>
        )}
      </YStack>

      <YStack px="$5" pt="$2" pb={insets.bottom + 20} gap="$4">
        <XStack>
          <Figure
            testID="recap-distance"
            label={t("recap.distance", "Distance")}
            value={formatDistance(track.distanceM, distanceUnit)}
          />
          <Figure
            testID="recap-moving"
            label={t("recap.moving_time", "Moving")}
            value={formatDuration(track.movingMs / 1000)}
          />
          <Figure
            testID="recap-pace"
            label={t("recap.pace", "Pace")}
            value={formatPace(track.distanceM, track.movingMs, distanceUnit)}
          />
        </XStack>

        {/* ODbL requires the OSM credit and OpenFreeMap requires its line to be displayed once
            MapLibre's own attribution button is off. It is not decoration: see
            constants/mapStyle.ts. */}
        <Text
          testID="recap-attribution"
          fontSize={11}
          color="$muted"
          style={{ textAlign: "center" }}
        >
          {MAP_ATTRIBUTION} {t("recap.privacy", "Your route never leaves this phone.")}
        </Text>
      </YStack>
    </YStack>
  );
}
