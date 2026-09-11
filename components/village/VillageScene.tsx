import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, XStack, YStack } from "tamagui";

import { AppButton } from "@/components/common/AppButton";
import { FlameFlicker } from "@/components/common/FlameFlicker";
import { Skeleton } from "@/components/common/Skeleton";
import { groupFamilies } from "@/components/village/rows";
import { VillageDetailSheet, type VillageSelection } from "@/components/village/VillageDetailSheet";
import { VillageEmbers } from "@/components/village/VillageEmbers";
import {
  Families,
  NextToRise,
  SinceLastQuest,
  VillageDone,
} from "@/components/village/VillageLists";
import { VillageReward } from "@/components/village/VillageReward";
import { VillageSceneViewer } from "@/components/village/VillageSceneViewer";
import { getSportSpriteAsset, getVillageTierAsset } from "@/constants/assetMap";
import { rawColors } from "@/constants/rawColors";
import { pickDailyVariant } from "@/constants/restMessages";
import { VILLAGE_ANCHORS } from "@/constants/villageAnchors";
import { VILLAGE_FLAVOUR } from "@/constants/villageFlavour";
import { dayKey } from "@/db/dates";
import { MUSCLE_LABELS } from "@/db/muscles";
import {
  getVillageScene,
  isDayOne,
  isVillageComplete,
  parseGrown,
  pickNextToRise,
  TIER_NAMES,
  type VillageBuilding,
  type VillageScene as VillageSceneData,
} from "@/db/village";
import { useHaptics } from "@/hooks/useHaptics";
import { useAnimationProps, useReducedMotion } from "@/hooks/useReducedMotion";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";
import { useUserStore } from "@/stores/user";

/**
 * How much slower the painting scrolls than the page. Low on purpose: the tier art is the one
 * thing on this screen that is supposed to feel like a place, and a strong parallax turns a
 * place into a carousel.
 */
const PARALLAX_FACTOR = 0.35;

/** How far the painting leans in on the building that just rose. */
const REWARD_ZOOM = 1.85;

/**
 * The return from a session, in ms from arrival: lean in on the spot, bring the card up, put
 * everything back. About five seconds, once per session, never on a plain visit.
 */
const REWARD_TIMING = { zoom: 250, card: 1300, done: 5200 } as const;
const LEAN = { duration: 900, easing: Easing.bezier(0.2, 0.7, 0.2, 1) } as const;

/**
 * Below this window height the square painting takes the whole fold, so it is cut to a band and
 * "Next to rise" starts above the fold. 700 dp is the line between a 360x640 phone and a 393x852
 * one. The full painting is still one tap away (VillageSceneViewer).
 */
const COMPACT_HEIGHT = 700;
const COMPACT_BAND = 0.62;
const COMPACT_CROP_TOP = 0.2;

export function VillageScene() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const language = useSettingsStore((s) => s.language);
  const lang = language === "fr" ? "fr" : "en";
  const villageName = useUserStore((s) => s.villageName);
  const sectionAnim = useAnimationProps("bouncy", { opacity: 0, y: 12 });
  const haptics = useHaptics();
  const reducedMotion = useReducedMotion();

  // The painting lags the page as it scrolls away. Written and read entirely on the UI thread:
  // `scrollY` is never touched from JS (docs/architecture/performance.md).
  const scrollY = useSharedValue(0);
  const zoom = useSharedValue(1);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  const paintingMotion = useAnimatedStyle(() => ({
    transform: [
      { translateY: reducedMotion ? 0 : scrollY.value * PARALLAX_FACTOR },
      { scale: zoom.value },
    ],
  }));

  // Written by the victory screen's "View Village" (formatGrown). A plain tab visit has none, so
  // the reward and the "Risen" marks only ever answer a session.
  const { grown } = useLocalSearchParams<{ grown?: string }>();
  const growth = parseGrown(grown);
  const risen = new Set(growth.map((g) => g.code));

  const [scene, setScene] = useState<VillageSceneData | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  // Read-only: a tap explains what earned the building, it never unlocks anything.
  const [selected, setSelected] = useState<VillageSelection | null>(null);
  // The sheet (portal, overlay, frame) is dead weight behind the scene until the first tap,
  // and has to outlive the selection afterwards or it would vanish instead of sliding shut.
  const [sheetMounted, setSheetMounted] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [rewardOpen, setRewardOpen] = useState(false);

  // Stable: the sheet subscribes to hardware back on it, and a fresh identity every render
  // would resubscribe every render.
  const closeDetail = useCallback(() => setSelected(null), []);

  const openBuilding = (building: VillageBuilding) => {
    // `selection` is the lightest tick, not a reward buzz.
    haptics.selection();
    setSheetMounted(true);
    setSelected({ kind: "building", building });
  };

  // Refetch on focus: the whole point of this screen is "what changed since I trained",
  // and a tab screen stays mounted, so a mount-only effect would show yesterday forever.
  const loadScene = useCallback(() => {
    getVillageScene()
      .then((data) => {
        setScene(data);
        setLoadFailed(false);
      })
      .catch((error) => {
        // This is the tab's only fetch: without the failed flag, a first-load failure
        // left the skeleton on screen forever. Later failures keep yesterday's scene.
        reportError("village.scene", error);
        setLoadFailed(true);
      });
  }, []);

  // Tab screens stay mounted, so a revisit inherited whatever offset the last visit left. The
  // scene *is* the screen, so a fresh visit starts at the top. Safe: the detail sheet and viewer
  // are modals, not routes, so focus only changes when actually leaving the tab.
  const scrollRef = useAnimatedRef<Animated.ScrollView>();

  useFocusEffect(
    useCallback(() => {
      loadScene();
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      scrollY.value = 0;
    }, [loadScene, scrollRef, scrollY]),
  );

  const ready = scene !== null;
  // Where the painting leans in. Nothing is drawn there: the gold dots that used to mark every
  // building were taken off the painting, and the anchors only say which part of it to zoom on.
  const focus = scene ? VILLAGE_ANCHORS[scene.tier].find((a) => risen.has(a.code)) : undefined;
  const hasFocus = focus !== undefined;
  // Read when the lean fires, not a dependency: the tab can still hold yesterday's scene when
  // `grown` arrives, and the fresh one flipping this used to cancel the reward mid-play.
  const hasFocusRef = useRef(hasFocus);
  useEffect(() => {
    hasFocusRef.current = hasFocus;
  });

  // Played once per `grown` value. The tab stays mounted and keeps its params, so a revisit
  // carries the same string and must not replay it; the next session writes a different one,
  // since a level only ever rises.
  const playedFor = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!ready || parseGrown(grown).length === 0 || playedFor.current === grown) return;
    playedFor.current = grown;
    const lean = (to: number) => {
      zoom.value = withTiming(to, LEAN);
    };
    const timers = [
      setTimeout(
        () => {
          if (hasFocusRef.current && !reducedMotion) lean(REWARD_ZOOM);
        },
        reducedMotion ? 0 : REWARD_TIMING.zoom,
      ),
      setTimeout(() => setRewardOpen(true), reducedMotion ? 0 : REWARD_TIMING.card),
      setTimeout(() => {
        setRewardOpen(false);
        lean(1);
      }, REWARD_TIMING.done),
    ];
    return () => {
      for (const timer of timers) clearTimeout(timer);
      zoom.value = 1;
      setRewardOpen(false);
    };
  }, [ready, grown, reducedMotion, zoom]);

  const dismissReward = () => {
    setRewardOpen(false);
    zoom.value = withTiming(1, LEAN);
  };

  // The tier art is square (1024x1024), and `cover` silently crops whatever the slot doesn't
  // match, so the slot is square too: the whole painting, edge to edge. Only a short screen cuts
  // it to a band, where a square would push everything else below the fold.
  const compact = height < COMPACT_HEIGHT;
  const heroHeight = compact ? Math.round(width * COMPACT_BAND) : width;
  const paintingTop = compact ? -Math.round(width * COMPACT_CROP_TOP) : 0;

  if (!scene) {
    if (loadFailed) {
      return (
        <YStack
          testID="village-screen"
          flex={1}
          bg="$background"
          items="center"
          justify="center"
          gap="$4"
          p="$4"
        >
          <Text fontSize={16} fontWeight="700" color="$text" style={{ textAlign: "center" }}>
            {t("village.load_error", "The village is out of reach")}
          </Text>
          <AppButton fullWidth={false} onPress={loadScene}>
            {t("common.retry", "Retry")}
          </AppButton>
        </YStack>
      );
    }
    return (
      <YStack testID="village-screen" flex={1} bg="$background">
        <Skeleton width="100%" height={heroHeight} radius={0} />
        <YStack gap="$3" p="$4">
          <Skeleton height={28} width="60%" />
          <Skeleton height={16} width="40%" />
        </YStack>
      </YStack>
    );
  }

  const tierName = TIER_NAMES[scene.tier][lang];
  // The tier only needs saying separately once the village has its own name.
  const tierLine = [
    villageName ? tierName : null,
    t("village.level_line", { level: scene.level }),
    scene.title[lang],
  ]
    .filter(Boolean)
    .join(" · ");
  const dayOne = isDayOne(scene.buildings);
  const complete = isVillageComplete(scene.tier, scene.buildings);
  const families = groupFamilies(scene.buildings, complete);
  const next = pickNextToRise(scene.buildings);
  const openDeeds = scene.buildings.filter((b) => b.tier === 4 && b.nextTarget !== null).length;
  // Weather, not a stat. It used to sit under the name, above the fold, in the place "Next to
  // rise" needed; Home's village band that took it next was removed with the Home redesign, so it
  // closes the page instead. Seeded by day *and* tier: it turns over at midnight and reads
  // differently once the village has grown.
  const weather = pickDailyVariant(VILLAGE_FLAVOUR[lang], `${dayKey(new Date())}:${scene.tier}`);

  return (
    <YStack testID="village-screen" flex={1} bg="$background">
      <Animated.ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {/* The scene is the screen: edge to edge, its own title, nothing framing it.
            `overflow="hidden"` is what keeps the parallaxed painting inside its own band
            instead of riding down over the list. */}
        <YStack
          width="100%"
          height={heroHeight}
          position="relative"
          overflow="hidden"
          onPress={() => {
            haptics.selection();
            setViewerOpen(true);
          }}
          accessibilityRole="button"
          accessibilityLabel={t("village.open_scene", "See the whole scene")}
        >
          {/* Only the painting moves: it parallaxes, and leans in on the building that just rose.
              The scrims and the title stay anchored. */}
          <Animated.View
            style={[
              {
                position: "absolute",
                top: paintingTop,
                left: 0,
                width,
                height: width,
                transformOrigin: focus ? `${focus.x}% ${focus.y}%` : "50% 50%",
              },
              paintingMotion,
            ]}
          >
            <Image
              source={getVillageTierAsset(scene.tier)}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              transition={300}
            />
          </Animated.View>

          {/* Top scrim so the status bar stays readable over bright artwork */}
          <LinearGradient
            colors={[rawColors.bgOverlaySoft, "transparent"]}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: insets.top + 48,
            }}
          />

          {/* Bottom scrim dissolves the artwork into the page; the title sits inside it */}
          <LinearGradient
            colors={["transparent", rawColors.bgOverlay, rawColors.bgDark]}
            locations={[0, 0.66, 0.94]}
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: Math.round(heroHeight * 0.62),
              justifyContent: "flex-end",
            }}
          >
            {/* The bottom 14 is what the panel below overlaps. */}
            <YStack px="$4" pb={28} gap={6}>
              {scene.dominantSport ? (
                <XStack items="center" gap={8}>
                  <Image
                    source={getSportSpriteAsset(scene.dominantSport.muscle)}
                    style={{ width: 20, height: 20 }}
                    contentFit="contain"
                  />
                  <Text fontSize={11.5} color="$textSecondary">
                    {t("village.focus_line", {
                      muscle: MUSCLE_LABELS[scene.dominantSport.muscle][lang],
                    })}
                  </Text>
                </XStack>
              ) : null}
              <Text fontWeight="700" fontSize={30} lineHeight={32} color="$text" numberOfLines={1}>
                {villageName || tierName}
              </Text>
              <XStack items="center" gap={10} flexWrap="wrap">
                <Text fontSize={13} fontWeight="500" color="$textSecondary">
                  {tierLine}
                </Text>
                {scene.flame > 0 && (
                  <XStack
                    items="center"
                    gap={5}
                    px={9}
                    py={3}
                    rounded={999}
                    bg="$glassBg"
                    borderWidth={1}
                    borderColor="$glassBorder"
                  >
                    <FlameFlicker size={14} />
                    <Text fontSize={11.5} fontWeight="600" color="$text">
                      {`${t(`village.flame_${scene.flame}`)} · ${t("village.flame_days", { count: scene.streakDays })}`}
                    </Text>
                  </XStack>
                )}
              </XStack>
            </YStack>
          </LinearGradient>

          {/* Last child on purpose: the bottom scrim is near-opaque over the lower half of the
              hero, so embers drawn before it would simply not be there. */}
          <VillageEmbers heroHeight={heroHeight} heroWidth={width} tier={scene.tier} />
        </YStack>

        {/* The panel rides up over the painting's last 14 dp, so the list reads as the scene's
            own ground rather than a second screen stacked under it. */}
        <YStack
          bg="$bgDark"
          borderTopWidth={1}
          borderColor="$glassBorder"
          borderTopLeftRadius={16}
          borderTopRightRadius={16}
          px="$4"
          pt="$4"
          gap={18}
          mt={-14}
          {...sectionAnim}
        >
          {complete ? <VillageDone name={villageName || tierName} openDeeds={openDeeds} /> : null}
          <NextToRise building={next} dayOne={dayOne} language={language} onOpen={openBuilding} />
          {growth.length > 0 ? (
            <SinceLastQuest growth={growth} buildings={scene.buildings} language={language} />
          ) : null}
          <Families families={families} risen={risen} language={language} onOpen={openBuilding} />
          <YStack gap={6}>
            <Text fontSize={12} lineHeight={17} color="$textSecondary" fontStyle="italic">
              {weather}
            </Text>
            <Text fontSize={11.5} lineHeight={17} color="$textSecondary" opacity={0.75}>
              {t("village.foot")}
            </Text>
          </YStack>
        </YStack>
      </Animated.ScrollView>

      {rewardOpen ? (
        <VillageReward
          growth={growth}
          buildings={scene.buildings}
          language={language}
          top={Math.round(heroHeight * 0.5)}
          onDismiss={dismissReward}
        />
      ) : null}

      {viewerOpen ? (
        <VillageSceneViewer
          tier={scene.tier}
          title={villageName || tierName}
          onClose={() => setViewerOpen(false)}
        />
      ) : null}

      {sheetMounted ? (
        <VillageDetailSheet
          selected={selected}
          onClose={closeDetail}
          language={language}
          bottomInset={insets.bottom}
        />
      ) : null}
    </YStack>
  );
}
