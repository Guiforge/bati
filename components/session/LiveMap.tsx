// `Map` is MapLibre's map component and shadows the global of the same name; aliased for the same
// reason as in `app/recap.tsx`.
import { Camera, GeoJSONSource, Layer, Map as MapLibreMap } from "@maplibre/maplibre-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { type ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, AppState } from "react-native";
import { Text, XStack, YStack } from "tamagui";
import { MapFootnote } from "@/components/session/MapFootnote";
import { HUD_HEIGHT } from "@/components/session/sessionArt";
import {
  LEAGUE_PIP_PAINT,
  mapStyle,
  mapStyleNoTiles,
  TRACE_GLOW_PAINT,
} from "@/constants/mapStyle";
import { rawColors } from "@/constants/rawColors";
import { toTrace } from "@/src/gps/trace";
import { reportError } from "@/src/reportError";
import { useExpeditionStore } from "@/stores/expedition";
import { useSettingsStore } from "@/stores/settings";

/** Close enough to read the street being walked, far enough to see the next turn. */
const FOLLOW_ZOOM = 16;

/** One fix a second, so the camera glides for as long as the next one takes to arrive. */
const FOLLOW_MS = 1000;

/**
 * What the slot is waiting for, over whatever fills it meanwhile.
 *
 * Before the first fix the picture of the movement sat there with nothing saying a map was on its
 * way, and after it the map was a dark rectangle for as long as MapLibre took to build its style.
 * Both are waits, and a wait that says nothing reads as a screen that failed.
 */
function Waiting({ label }: { label: string }) {
  return (
    <YStack
      position="absolute"
      t={0}
      b={0}
      l={0}
      r={0}
      items="center"
      justify="center"
      pointerEvents="none"
    >
      <XStack
        testID="live-map-loading"
        items="center"
        gap="$2"
        px="$3"
        py="$2"
        rounded="$10"
        bg="$surface"
      >
        <ActivityIndicator size="small" color={rawColors.resourceGold} />
        <Text fontSize={13} color="$text">
          {label}
        </Text>
      </XStack>
    </YStack>
  );
}

/**
 * The walk so far, on the map, while it is happening.
 *
 * It takes the place the movement's picture takes on every other set, because a walk has no form
 * to demonstrate and the picture was a still of someone else's. Same size rules as `ExerciseHero`,
 * so the column below it lays out the same way on both.
 *
 * The recap's style and the recap's gold, with less on it. No pace ramp: its ends are this run's
 * own percentiles, which move with every fix, so the colours would shift under the hero's eyes.
 * The camera follows the last fix and every gesture is off, since a map that can be panned is a
 * map that gets panned by a pocket.
 *
 * This reverses "numbers only, battery decision" from docs/designs/gps-without-google.md. The
 * screen is still never held awake on an outing, and MapLibre draws nothing while it is off.
 *
 * Before the first fix it shows `placeholder`, the movement's picture. A camera centred nowhere is
 * the middle of the Gulf of Guinea, and the empty dark slot that stood in for it read as a map
 * that had failed to load. The panel under it already says the sky is being found.
 */
export function LiveMap({
  minHeight,
  topInset,
  placeholder,
}: {
  minHeight: number;
  topInset: number;
  placeholder: ReactNode;
}) {
  /**
   * Whether anyone can see the map. Starts true: this screen mounts in front of the hero.
   *
   * The service keeps sending a fix a second with the screen off, and every one of them re-folded
   * the whole walk and handed MapLibre the whole path and a camera move. With the phone in a
   * pocket the JS thread fell behind, and unlocking after an hour meant draining that backlog
   * first: a frozen screen for seconds or minutes. In the background the selector returns a
   * constant, so a fix wakes nothing here, and the map is unmounted, so it holds no GL surface.
   * On return it is folded once, from every fix the store kept meanwhile.
   */
  const { t } = useTranslation();
  const [visible, setVisible] = useState(true);
  /** Whether MapLibre has drawn its style since the map last mounted. */
  const [styleLoaded, setStyleLoaded] = useState(false);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      // Not `=== "active"`: iOS reports `inactive` for the app switcher and a call banner, with
      // the map still on screen.
      setVisible(state !== "background");
      // The map unmounts in the background, so it builds its style again on the way back.
      if (state === "background") setStyleLoaded(false);
    });
    return () => subscription.remove();
  }, []);
  const fixes = useExpeditionStore((s) => (visible ? s.fixes : null));
  const tilesEnabled = useSettingsStore((s) => s.mapTilesEnabled);
  if (fixes === null) return placeholder;

  // ponytail: the whole trace is folded again on every fix while the map is on screen, a few
  // milliseconds for an hour's 3,600 points. Fold incrementally, or give the live map a lighter
  // `toTrace` without the colour bands it never draws, if a measured walk shows the cost.
  const trace = toTrace(fixes);
  const here = trace.end;
  if (here === null) {
    return (
      // Sized like the map below, so the picture inside it lays out as it does on its own.
      <YStack style={{ flex: 1 }} minH={topInset + HUD_HEIGHT + minHeight} width="100%">
        {placeholder}
        <Waiting label={t("session.live_map_finding")} />
      </YStack>
    );
  }

  return (
    <YStack
      testID="live-map"
      // Plain RN flex, for the reason `ExerciseHero` gives: Tamagui's `flex={1}` sizes to content.
      style={{ flex: 1 }}
      minH={topInset + HUD_HEIGHT + minHeight}
      width="100%"
      bg="$bgDark"
    >
      <MapLibreMap
        style={{ flex: 1 }}
        mapStyle={tilesEnabled ? mapStyle : mapStyleNoTiles}
        // The credit is `MapFootnote`, in the app's own type, as on the recap.
        attribution={false}
        logo={false}
        compass={false}
        dragPan={false}
        touchZoom={false}
        touchRotate={false}
        touchPitch={false}
        doubleTapZoom={false}
        onDidFinishLoadingStyle={() => setStyleLoaded(true)}
        // Never a spinner for ever: a map that failed says so in the log and the trace still draws.
        onDidFailLoadingMap={() => {
          setStyleLoaded(true);
          reportError("liveMap.load", new Error("MapLibre failed to load the live map"));
        }}
      >
        {/* Framed where the hero is before the first glide. The map remounts on every unlock, and
            without it the one-second follow starts from MapLibre's default camera at 0,0. */}
        <Camera
          initialViewState={{ center: here, zoom: FOLLOW_ZOOM }}
          center={here}
          zoom={FOLLOW_ZOOM}
          duration={FOLLOW_MS}
          easing="linear"
        />

        {/* biome-ignore lint/correctness/useUniqueElementIds: MapLibre source and layer ids
            are its own style namespace, not DOM ids. */}
        <GeoJSONSource id="live-path" data={trace.path}>
          {/* biome-ignore lint/correctness/useUniqueElementIds: same MapLibre namespace */}
          <Layer
            id="live-glow"
            type="line"
            layout={{ "line-cap": "round", "line-join": "round" }}
            paint={TRACE_GLOW_PAINT}
          />
          {/* biome-ignore lint/correctness/useUniqueElementIds: same MapLibre namespace */}
          <Layer
            id="live-line"
            type="line"
            layout={{ "line-cap": "round", "line-join": "round" }}
            paint={{ "line-color": rawColors.resourceGold, "line-width": 4 }}
          />
        </GeoJSONSource>

        {/* biome-ignore lint/correctness/useUniqueElementIds: same MapLibre namespace */}
        <GeoJSONSource id="live-leagues" data={trace.leagues}>
          {/* biome-ignore lint/correctness/useUniqueElementIds: same MapLibre namespace */}
          <Layer id="live-league-pips" type="circle" paint={LEAGUE_PIP_PAINT} />
        </GeoJSONSource>

        {/* Where the hero is: the recap's end pip, since that is what it will become. */}
        {/* biome-ignore lint/correctness/useUniqueElementIds: same MapLibre namespace */}
        <GeoJSONSource
          id="live-here"
          data={{
            type: "Feature",
            properties: {},
            geometry: { type: "Point", coordinates: here },
          }}
        >
          {/* biome-ignore lint/correctness/useUniqueElementIds: same MapLibre namespace */}
          <Layer
            id="live-here-pip"
            type="circle"
            paint={{
              "circle-radius": 6,
              "circle-color": rawColors.resourceFire,
              "circle-stroke-width": 2,
              "circle-stroke-color": rawColors.bgDark,
            }}
          />
        </GeoJSONSource>
      </MapLibreMap>

      {/* The status bar's band, like the picture this replaces, and the fade into the panel. */}
      <LinearGradient
        colors={[rawColors.bgDark, "transparent"]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: topInset + 28 }}
        pointerEvents="none"
      />
      <LinearGradient
        colors={["transparent", rawColors.bgDark]}
        style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 56 }}
        pointerEvents="none"
      />

      <YStack position="absolute" b="$3" l="$4" r="$4">
        <MapFootnote />
      </YStack>

      {styleLoaded ? null : <Waiting label={t("session.live_map_loading")} />}
    </YStack>
  );
}
