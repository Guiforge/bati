// `Map` is MapLibre's map component and shadows the global of the same name; aliased rather than
// ignored, because a file that redefines `Map` is a trap for whoever edits it next.
import { Camera, GeoJSONSource, Layer, Map as MapLibreMap } from "@maplibre/maplibre-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, XStack, YStack } from "tamagui";
import { AppButton, AppIconButton } from "@/components/common/AppButton";
import { Skeleton } from "@/components/common/Skeleton";
import { useToast } from "@/components/common/Toast";
import { ChevronLeft, Share2 } from "@/components/icons";
import { getDateTimeFormat } from "@/constants/dateFormatters";
import { formatClock, formatDistance, formatPace } from "@/constants/distanceFormat";
import { MAP_ATTRIBUTION, mapStyle, mapStyleNoTiles } from "@/constants/mapStyle";
import { rawColors } from "@/constants/rawColors";
import { outingSession, pointsOf } from "@/db/gps";
import type { DistanceUnit } from "@/db/preferences";
import { listQuestTemplates } from "@/db/quests";
import type { LocationFix } from "@/modules/bati-location";
import { toTrace } from "@/src/gps/trace";
import { accept, EMPTY } from "@/src/gps/track";
import { flushTrack, shareTrack, trackFileFor } from "@/src/gps/trackFile";
import { localizedTitle } from "@/src/i18n/localized";
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
 * Nothing here recomputes anything. The ground is `completed_sessions.leaguesM`, the metres the
 * road was actually paid in; the fixes are folded through `accept` only to draw the line and to
 * time it. Every distance and pace goes through `constants/distanceFormat.ts` — the two rules
 * that keep one run from having two different lengths.
 */

/** Everything this screen knows about one run, read in one pass. */
type Recap = {
  fixes: LocationFix[];
  /** The quest's name in the hero's language, `null` when the row names no quest. */
  title: string | null;
  performedAt: Date | null;
  /** The reducer's metres, `null` on an outing that measured no ground. */
  leaguesM: number | null;
  /**
   * The reducer's moving seconds, `null` on an outing saved before 0046 — those rows never
   * wrote one, and this screen would rather say nothing than replay a trace to invent it.
   */
  movingSeconds: number | null;
};

const NOTHING: Recap = {
  fixes: [],
  title: null,
  performedAt: null,
  leaguesM: null,
  movingSeconds: null,
};

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

/**
 * What the ground was worth, in the two columns the row carries.
 *
 * Nothing here is derived from the fixes. `leaguesM` is what the village was paid, `movingSeconds`
 * is what the XP ceiling was paid, and both were decided once by the reducer at save — summing
 * `distFromPrev` or folding the trace again on this screen is how one walk ends up with two
 * lengths and a pace that belongs to neither.
 */
function Figures({
  leaguesM,
  movingSeconds,
  unit,
}: {
  leaguesM: number;
  movingSeconds: number | null;
  unit: DistanceUnit;
}) {
  const { t } = useTranslation();
  return (
    <XStack>
      {/* The same three keys the victory screen reads. They were `recap.*` here and
          `session.expedition_*` there, so one value wore "Distance" on one screen and
          "Terrain parcouru" on the next, for the same walk, two taps apart. */}
      <Figure
        testID="recap-distance"
        label={t("session.expedition_ground")}
        value={formatDistance(leaguesM, unit)}
      />
      {/* An outing saved before 0046 has metres and no seconds. Two thirds of a row is the honest
          answer there: a clock replayed from the fixes, and a pace divided by it, would be
          printed with the same confidence as the ones that were measured. */}
      {movingSeconds === null ? null : (
        <>
          <Figure
            testID="recap-moving"
            label={t("session.expedition_moving")}
            value={formatClock(movingSeconds * 1000)}
          />
          <Figure
            testID="recap-pace"
            label={t("session.expedition_pace")}
            value={formatPace(leaguesM, movingSeconds * 1000, unit)}
          />
        </>
      )}
    </XStack>
  );
}

/**
 * The line under the map, and which of the two lines it is says what actually happened.
 *
 * Allowed, it is the credit: ODbL requires the OSM one and OpenFreeMap requires its own to be
 * displayed once MapLibre's attribution button is off, which it is here. Refused, that credit
 * would be a claim rather than a courtesy, because nothing of theirs was ever fetched, so its
 * place is taken by the offer.
 *
 * The offer's sentence is the confirmation. It names the host and says what leaves before a
 * single byte does, which is the whole of what a dialog would have asked twice; the tap is the
 * answer, and the basemap arrives under the trace that is already on screen.
 */
function MapFootnote({ enabled, onEnable }: { enabled: boolean; onEnable: () => void }) {
  const { t } = useTranslation();

  if (enabled) {
    return (
      <Text testID="recap-attribution" fontSize={11} color="$muted" style={{ textAlign: "center" }}>
        {MAP_ATTRIBUTION} {t("recap.privacy")}
      </Text>
    );
  }

  return (
    <YStack testID="recap-map-offer" gap="$3">
      <Text fontSize={12} color="$textSecondary" style={{ textAlign: "center" }}>
        {t("recap.map_offer")}
      </Text>
      <AppButton testID="recap-map-enable" variant="outline" fontSize={16} onPress={onEnable}>
        {t("recap.map_enable")}
      </AppButton>
    </YStack>
  );
}

export default function ExpeditionRecapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ session?: string | string[] }>();
  const distanceUnit = useSettingsStore((s) => s.distanceUnit);
  const language = useSettingsStore((s) => s.language);
  // Off unless the hero has said yes. The whole map branch below reads this, and the style it
  // picks is what decides whether this screen touches a network at all.
  const mapTilesEnabled = useSettingsStore((s) => s.mapTilesEnabled);
  const setMapTilesEnabled = useSettingsStore((s) => s.setMapTilesEnabled);
  const { showError } = useToast();

  const sessionUuid = Array.isArray(params.session) ? params.session[0] : params.session;

  // `null` while the read is still on its way. A recap with no fixes is an answer — "this quest
  // never left the walls" — and the two must not render the same thing.
  const [recap, setRecap] = useState<Recap | null>(null);

  const load = useCallback(
    async (uuid: string) => {
      const [fixes, session] = await Promise.all([pointsOf(uuid), outingSession(uuid)]);
      // The same door the journal opens for the same fact, and `listQuestTemplates` is cached:
      // naming the outing costs one query on a cold app and nothing after it.
      const quest =
        session?.questId == null
          ? undefined
          : (await listQuestTemplates()).find((q) => q.id === session.questId);
      setRecap({
        fixes,
        title: quest ? localizedTitle(quest, language) : null,
        performedAt: session?.performedAt ?? null,
        leaguesM: session?.leaguesM ?? null,
        movingSeconds: session?.movingSeconds ?? null,
      });
    },
    [language],
  );

  useEffect(() => {
    if (!sessionUuid) {
      setRecap(NOTHING);
      return;
    }
    load(sessionUuid).catch((e) => {
      reportError("recap.points", e);
      setRecap(NOTHING);
    });
  }, [sessionUuid, load]);

  const fixes = recap?.fixes ?? null;
  // The fold is the line and the file it is written to, and nothing else. Both figures under the
  // map are columns now: `leaguesM` since 0044, `movingSeconds` since 0046. Replaying the fixes
  // for either was a second answer to a question the reducer had already answered once, and the
  // two part company whenever a flush fails — `stores/expedition.ts` drops a batch of up to
  // thirty fixes on a database error, so the distance still holds them and the replay does not.
  // The pace between a kept distance and a replayed clock is wrong with nothing able to notice.
  const drawn = fixes ?? [];
  const track = drawn.reduce(accept, EMPTY);
  const trace = toTrace(drawn);

  /**
   * The trace, as a file the hero owns.
   *
   * Through `trackFile.ts` rather than a second call to `toGpx` here: that module already decides
   * where a track is written and what it is called, and the format is the part importers reject.
   * The name comes from the first fix, so it says when the outing happened and re-exporting the
   * same one overwrites its own file instead of littering.
   *
   * Only where a trace exists. An expedition whose service never started has nothing to hand over,
   * and a share sheet that opens on an empty file is worse than no button.
   */
  const exportTrace = () => {
    const first = fixes?.[0];
    if (!first || !fixes) return;

    const file = trackFileFor(first.t);
    // The file's own fixes, measured the way the panel measured them: a GPX describes what is
    // inside it, so a batch that never reached the table must not be in its header either.
    flushTrack(file, fixes, track.distanceM);
    shareTrack(file).catch((error: unknown) => {
      reportError("recap.share", error);
      showError(t("recap.export_failed"));
    });
  };

  // The refused style has no vector source and no `glyphs`, so MapLibre has nothing to fetch:
  // the trace is drawn on the app's own ground and that is the whole picture. See
  // constants/mapStyle.ts.
  const basemap = mapTilesEnabled ? mapStyle : mapStyleNoTiles;

  // Neither line belongs under a screen that never drew a map: there is no credit to give and
  // nothing to switch on.
  const footnote =
    trace.bounds === null ? null : (
      <MapFootnote
        enabled={mapTilesEnabled}
        onEnable={() => {
          setMapTilesEnabled(true).catch((error) => {
            reportError("recap.mapTilesWrite", error);
          });
        }}
      />
    );

  const header = (
    <XStack items="center" gap="$3" px="$5" pt={insets.top + 12} pb="$3">
      <AppIconButton
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel={t("common.go_back", "Go back")}
      >
        <ChevronLeft size={22} color="$text" strokeWidth={2.5} />
      </AppIconButton>
      {/* Which outing, and when. Two runs reached from the journal opened two identical cards
          titled "The ground covered", which is the name of the screen rather than of the walk.
          The generic title stays as the fallback for a session whose row names no quest. */}
      <YStack flex={1} gap="$1">
        {recap === null ? (
          <Skeleton height={18} width="60%" bg="$surface" />
        ) : (
          <>
            <Text fontWeight="700" fontSize={20} color="$text" numberOfLines={1}>
              {recap.title ?? t("recap.title")}
            </Text>
            {recap.performedAt ? (
              <Text testID="recap-date" fontSize={12} color="$textSecondary" numberOfLines={1}>
                {getDateTimeFormat(language, {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(recap.performedAt)}
              </Text>
            ) : null}
          </>
        )}
      </YStack>
      {fixes && fixes.length > 0 ? (
        <AppIconButton
          testID="recap-export"
          onPress={exportTrace}
          accessibilityRole="button"
          accessibilityLabel={t("recap.export")}
        >
          <Share2 size={20} color="$text" strokeWidth={2.5} />
        </AppIconButton>
      ) : null}
    </XStack>
  );

  return (
    // `$bgDark` and not `$background`: the theme background is translucent over the app's city
    // illustration, and the map's ground is opaque `bgDark`. Painting the page in anything else
    // draws exactly the rectangle edge this whole design exists to remove.
    <YStack testID="expedition-recap-screen" flex={1} bg="$bgDark">
      {header}

      <YStack flex={1}>
        {recap === null ? (
          // The map's place, held open. "Chargement…" in the middle of the page is a sentence
          // where a picture is about to be, and it reads as a verdict on the walk when the read
          // then comes back empty.
          <YStack testID="recap-loading" flex={1} px="$5" justify="center">
            <Skeleton height={260} radius={16} bg="$surface" />
          </YStack>
        ) : trace.bounds === null ? (
          // No fixes, which is every strength quest ever logged. An empty basemap centred on
          // nowhere is worse than no map: it says the trace was lost when there never was one.
          <YStack flex={1} items="center" justify="center" px="$6">
            <Text
              testID="recap-no-trace"
              fontSize={15}
              color="$textSecondary"
              style={{ textAlign: "center" }}
            >
              {t("recap.no_trace")}
            </Text>
          </YStack>
        ) : (
          <YStack flex={1} testID="recap-map">
            <MapLibreMap
              style={{ flex: 1 }}
              mapStyle={basemap}
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
        {/* Silence rather than three zeros. An outing whose service never started has no
            `leaguesM`, and "0 m · 0:00 · —" reads as a verdict on the walk instead of as an
            absence of measurement. */}
        {recap?.leaguesM ? (
          <Figures
            leaguesM={recap.leaguesM}
            movingSeconds={recap.movingSeconds}
            unit={distanceUnit}
          />
        ) : null}

        {footnote}
      </YStack>
    </YStack>
  );
}
