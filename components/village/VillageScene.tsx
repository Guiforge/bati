import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  type LayoutChangeEvent,
  PixelRatio,
  Pressable,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, XStack, YStack } from "tamagui";
import { VillagerCameo } from "@/components/chorus/VillagerCameo";
import { AppButton } from "@/components/common/AppButton";
import { FlameFlicker } from "@/components/common/FlameFlicker";
import { Skeleton } from "@/components/common/Skeleton";
import { Crest } from "@/components/village/Crest";
import { CrestSheet, type CrestView } from "@/components/village/CrestSheet";
import { crestFootprint } from "@/components/village/crestGeometry";
import { revealedToday, useCrestLine } from "@/components/village/crestLine";
import { groupFamilies } from "@/components/village/rows";
import { VillageDetailSheet, type VillageSelection } from "@/components/village/VillageDetailSheet";
import { VillageEmbers } from "@/components/village/VillageEmbers";
import {
  Families,
  NextToRise,
  SinceLastQuest,
  VillageTier,
} from "@/components/village/VillageLists";
import { VillageReward } from "@/components/village/VillageReward";
import { VillageSceneViewer } from "@/components/village/VillageSceneViewer";
import {
  villageCameoBand,
  villageHeroSlot,
  villageTitleTop,
} from "@/components/village/villageArt";
import { getSportSpriteAsset, getVillageTierAsset } from "@/constants/assetMap";
import { CONTENT_MAX_WIDTH } from "@/constants/layout";
import { rawColors } from "@/constants/rawColors";
import { pickDailyVariant } from "@/constants/restMessages";
import { VILLAGE_ANCHORS } from "@/constants/villageAnchors";
import { VILLAGE_FLAVOUR } from "@/constants/villageFlavour";
import { type Crest as CrestData, getCrest } from "@/db/crest";
import { dayKey } from "@/db/dates";
import { MUSCLE_LABELS } from "@/db/labels";
import type { RecentFeeds } from "@/db/milestone";
import { getRecentFeeds } from "@/db/milestoneFeed";
import { formatCount } from "@/db/targets";
import {
  getTierProgress,
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
const CREST_SIZE = 56;
/** The name's line height: `TitleText` and the row that centres it share it. */
const TITLE_LINE = 32;

/**
 * The village's name, as the hero title; loading and loaded draw it through here, so it never
 * moves. Android never breaks a word after its hyphen, so a long name was cut mid-word
 * ("Rochebrune-sur-La / nde"): a zero-width space after each one gives it somewhere to wrap.
 */
function TitleText({ children }: { children: string }) {
  return (
    <Text
      shrink={1}
      fontFamily="$heading"
      fontWeight="700"
      fontSize={30}
      lineHeight={TITLE_LINE}
      color="$text"
      numberOfLines={2}
    >
      {children.replace(/-/g, "-\u200B")}
    </Text>
  );
}

/**
 * Two bone-coloured eyes in the dark, before the 8th session: still, no halo, no animation. They
 * sit in the crest's own slot, same place and same size, so the name beside them is where it will
 * be when the crest comes, and where the skeleton put it.
 */
function Glow() {
  return (
    <YStack
      testID="village-glow-slot"
      {...crestFootprint(CREST_SIZE, true)}
      items="center"
      justify="center"
    >
      {/* Upright ovals, well apart: flat dashes read as "- -", a missing value. */}
      <XStack testID="village-glow" gap={16} accessible={false}>
        <YStack width={6} height={10} rounded={999} bg="$text" />
        <YStack width={6} height={10} rounded={999} bg="$text" />
      </XStack>
    </YStack>
  );
}

/** The title block's own box: the loaded header and its skeleton share it, so nothing slides. */
const TITLE_BLOCK_STYLE = { px: "$4", pb: 28, gap: 6 } as const;
/** A line of the header's small text: its height at the current font scale, for the skeleton. */
const TEXT_LINE = 17;
/** Stands where the level's number goes while the line is translated. */
const LEVEL_MARK = "\u0001";
/**
 * The name's line is centred on the crest at its own height, from the row's top. The row is
 * top-aligned, so a chip that wraps under the name (or is not there) cannot move the name: it
 * only makes the row taller.
 */
const nameRow = () =>
  ({
    flex: 1,
    minW: 0,
    flexWrap: "wrap",
    items: "center",
    columnGap: 10,
    rowGap: 4,
    pt: (crestFootprint(CREST_SIZE, true).height - TITLE_LINE) / 2,
  }) as const;
/** The flame chip: about 118 wide and 24 high at 100 %, 14 dp icon and 11.5 text plus padding. */
const CHIP_W = 118;
const CHIP_H = 24;

const LEAN = { duration: 900, easing: Easing.bezier(0.2, 0.7, 0.2, 1) } as const;

export function VillageScene() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const language = useSettingsStore((s) => s.language);
  const lang = language;
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

  // The pinned status scrim comes in over the distance the painting's own top scrim takes to
  // scroll away (`insets.top + 48`, below), so the clock always has one of the two behind it and
  // the painting runs full-bleed under the status bar at rest. UI thread only, like the parallax.
  const statusScrimFade = insets.top + 48;
  const statusScrimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, statusScrimFade], [0, 1], Extrapolation.CLAMP),
  }));

  // Written by the victory screen's "View Village" (formatGrown). A plain tab visit has none, so
  // the reward and the "Risen" marks only ever answer a session.
  const { grown } = useLocalSearchParams<{ grown?: string }>();
  const growth = parseGrown(grown);
  const risen = new Set(growth.map((g) => g.code));

  const [scene, setScene] = useState<VillageSceneData | null>(null);
  const [feeds, setFeeds] = useState<RecentFeeds | null>(null);
  // Read with the scene, in the same focus: one answer for the whole header, so the glow is never
  // drawn for a hero whose crest has simply not arrived yet.
  // `undefined` is a crest that could not be read: the slot stays empty and nothing is said.
  const [crest, setCrest] = useState<CrestData | null | undefined>(null);
  // Whether any visit has read the crest: only then is a failed read allowed to keep the last one.
  const crestRead = useRef(false);
  const loadId = useRef(0);
  // How tall the title block really is: at a large font the crest, the wrapped name and the two
  // lines outgrow the painting's band, and the block must not climb under the status bar.
  const [titleHeight, setTitleHeight] = useState(0);
  const measureTitle = (e: LayoutChangeEvent) =>
    setTitleHeight(Math.round(e.nativeEvent.layout.height));
  const [loadFailed, setLoadFailed] = useState(false);
  // Read-only: a tap explains what earned the building, it never unlocks anything.
  const [selected, setSelected] = useState<VillageSelection | null>(null);
  // The sheet (portal, overlay, frame) is dead weight behind the scene until the first tap,
  // and has to outlive the selection afterwards or it would vanish instead of sliding shut.
  const [sheetMounted, setSheetMounted] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [rewardOpen, setRewardOpen] = useState(false);
  const [crestView, setCrestView] = useState<CrestView | null>(null);

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
    // Two focuses in a row can be answered in the wrong order; only the last one may apply.
    const mine = ++loadId.current;
    // The crest never fails the screen: only the scene does. An unreadable crest leaves its slot
    // empty (no eyes, no sentence: nothing asserted) and the next visit tries again.
    const readCrest = getCrest().catch((error) => {
      reportError("village.crest", error);
      return undefined;
    });
    // Like the crest, the estimates never fail the screen: unread, the cards say no sentence.
    const readFeeds = getRecentFeeds().catch((error) => {
      reportError("village.feeds", error);
      return null;
    });
    Promise.all([getVillageScene(), readCrest, readFeeds])
      .then(([data, crestData, feedsData]) => {
        if (mine !== loadId.current) return;
        setScene(data);
        if (feedsData !== null) setFeeds(feedsData);
        // An unreadable crest after a drawn one keeps the drawn one, like the scene keeps yesterday's.
        if (crestData !== undefined) crestRead.current = true;
        if (crestData !== undefined || !crestRead.current) setCrest(crestData);
        setLoadFailed(false);
      })
      .catch((error) => {
        if (mine !== loadId.current) return;
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
      scrollY.set(0);
    }, [loadScene, scrollRef, scrollY]),
  );

  const crestLine = useCrestLine(
    crest ?? null,
    villageName,
    crest != null && revealedToday(crest.revealedAt, new Date()),
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
      zoom.set(withTiming(to, LEAN));
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
      zoom.set(1);
      setRewardOpen(false);
    };
  }, [ready, grown, reducedMotion, zoom]);

  const dismissReward = () => {
    setRewardOpen(false);
    zoom.set(withTiming(1, LEAN));
  };

  // The column, not the window. The tab scene is capped at CONTENT_MAX_WIDTH and
  // `useWindowDimensions` cannot see that: on a tablet it reports 800 where the painting has 520
  // to fill, which both cuts the square off at the column edge and trips the compact band for a
  // window that does not need it.
  const columnWidth = Math.min(width, CONTENT_MAX_WIDTH);
  const { heroHeight: bandHeight, paintingTop } = villageHeroSlot(columnWidth, height);
  // The name is pinned from the top, so what sits under it (a Focus line that day one lacks, a
  // two-line animal sentence) can only push the hero longer, never move the name.
  const titleTop = villageTitleTop(bandHeight, insets.top);
  const heroHeight = Math.max(bandHeight, titleTop + titleHeight);

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
            {t("village.load_error")}
          </Text>
          <AppButton fullWidth={false} onPress={loadScene}>
            {t("common.retry")}
          </AppButton>
        </YStack>
      );
    }
    // The loaded header's own layout, bar for bar: the name stays where it will be, the lines
    // under it are held at their height. The block's height goes into `titleHeight` too, so the
    // hero is already its final height when the data arrives.
    const lineHeight = Math.round(TEXT_LINE * PixelRatio.getFontScale());
    return (
      <YStack testID="village-screen" flex={1} bg="$background">
        <YStack testID="village-hero-loading" width="100%" height={heroHeight}>
          <YStack position="absolute" t={0} l={0} r={0} b={0}>
            <Skeleton width="100%" height={heroHeight} radius={0} />
          </YStack>
          <YStack
            testID="village-title"
            position="absolute"
            t={titleTop}
            l={0}
            r={0}
            {...TITLE_BLOCK_STYLE}
            onLayout={measureTitle}
          >
            <XStack items="flex-start" gap={10}>
              <Skeleton
                testID="village-crest-skeleton"
                bg="$surface2"
                {...crestFootprint(CREST_SIZE, true)}
              />
              <XStack testID="village-name-row" {...nameRow()}>
                {villageName ? <TitleText>{villageName}</TitleText> : null}
                {/* The flame chip's room (a streak is the common case): where it wraps under
                    the name, the name is already as high as it will be. */}
                <Skeleton
                  testID="village-chip-skeleton"
                  width={CHIP_W}
                  height={CHIP_H}
                  radius={999}
                />
              </XStack>
            </XStack>
            <Skeleton height={lineHeight} width="55%" />
            <Skeleton height={lineHeight} width="85%" />
            <Skeleton height={20} width="40%" />
          </YStack>
        </YStack>
        <YStack gap="$3" p="$4">
          <Skeleton height={28} width="60%" />
          <Skeleton height={16} width="40%" />
        </YStack>
      </YStack>
    );
  }

  const tierName = TIER_NAMES[scene.tier][lang];
  // The tier only needs saying separately once the village has its own name.
  // The level's number is bold. Translated with a marker and split on it, so each language
  // keeps its own word order ("Level 5", "Nivel 5") and nothing is concatenated around a number.
  const [beforeLevel = "", afterLevel = ""] = t("village.level_line", { level: LEVEL_MARK }).split(
    LEVEL_MARK,
  );
  const dayOne = isDayOne(scene.buildings);
  const complete = isVillageComplete(scene.tier, scene.buildings);
  const families = groupFamilies(scene.buildings, complete);
  const next = pickNextToRise(scene.buildings, feeds);
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
        testID="village-scroll"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {/* The scene is the screen: edge to edge, its own title, nothing framing it.
            `overflow="hidden"` is what keeps the parallaxed painting inside its own band
            instead of riding down over the list. */}
        <YStack
          testID="village-hero"
          width="100%"
          height={heroHeight}
          position="relative"
          overflow="hidden"
          onPress={() => {
            haptics.selection();
            setViewerOpen(true);
          }}
          accessibilityRole="button"
          accessibilityLabel={t("village.open_scene")}
        >
          {/* Only the painting moves: it parallaxes, and leans in on the building that just rose.
              The scrims and the title stay anchored. */}
          <Animated.View
            style={[
              {
                position: "absolute",
                top: paintingTop,
                left: 0,
                width: columnWidth,
                height: columnWidth,
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

          {/* Bottom scrim dissolves the artwork into the page; the title sits over it, further
              down this list. */}
          <LinearGradient
            colors={["transparent", rawColors.bgOverlay, rawColors.bgDark]}
            locations={[0, 0.66, 0.94]}
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: Math.max(Math.round(heroHeight * 0.62), heroHeight - titleTop + 24),
            }}
          />

          {/* Handed only the part of the hero above the title: a mote that started inside the
              title block fell on the status line and read as a full stop ("Divin ."). */}
          {/* Under the title, over the scrim: the scrim is near-opaque over the lower half of the
              hero, so embers drawn before it would simply not be there, and one drawn over the
              title fell on the crest and read as a ring. */}
          <VillageEmbers heroHeight={titleTop} heroWidth={columnWidth} tier={scene.tier} />

          {/* The bottom 14 is what the panel below overlaps. The focus line comes last, where
              the scrim is darkest: above the name it sat on the bright top of the painting
              (an aurora on tier 12), secondary text on pale turquoise. The flame shares the
              name's line, which gives the panel back a whole row. Its box is the skeleton's. */}
          <YStack
            testID="village-title"
            position="absolute"
            t={titleTop}
            l={0}
            r={0}
            {...TITLE_BLOCK_STYLE}
            onLayout={measureTitle}
          >
            <XStack items="flex-start" gap={10}>
              {crest === undefined ? (
                <YStack testID="village-crest-empty" {...crestFootprint(CREST_SIZE, true)} />
              ) : crest === null ? (
                <Glow />
              ) : (
                // The shield wins its own press over the hero's "see the scene"; the plate is at
                // least 44 on both sides (56 plus its padding).
                <Pressable
                  testID="village-crest"
                  accessibilityRole="button"
                  accessibilityLabel={t(`village.crest_why_title_${crest.animal}`)}
                  onPress={() => {
                    haptics.selection();
                    setCrestView("why");
                  }}
                >
                  <Crest crest={crest} size={CREST_SIZE} onPainting />
                </Pressable>
              )}
              {/* The chip wraps under the name when the row is full: a long name takes two
                  lines and nothing is cut. */}
              <XStack testID="village-name-row" {...nameRow()}>
                <TitleText>{villageName || tierName}</TitleText>
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
                    <Text fontSize={11.5} fontWeight="600" color="$text" numberOfLines={1}>
                      {`${t(`village.flame_${scene.flame}`)} · ${t("village.flame_days", { days: formatCount(language, scene.streakDays) })}`}
                    </Text>
                  </XStack>
                )}
              </XStack>
            </XStack>
            <Text fontSize={13} lineHeight={TEXT_LINE} fontWeight="500" color="$textSecondary">
              {villageName ? `${tierName} · ` : null}
              {beforeLevel}
              <Text fontWeight="700">{scene.level}</Text>
              {`${afterLevel} · ${scene.title[lang]}`}
            </Text>
            {crest === undefined ? null : (
              <Text testID="village-crest-line" fontSize={13} lineHeight={TEXT_LINE} color="$text">
                {crestLine}
              </Text>
            )}
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
          </YStack>

          {/* The one floating villager in the app: part of the painting, above the title, so it
              scrolls with it and the cards below are never under it. Its zone is this band. */}
          <VillagerCameo band={villageCameoBand(width, height, insets.top)} />
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
          <VillageTier
            progress={getTierProgress(scene.level, scene.totalXp)}
            name={villageName || tierName}
            complete={complete}
            openDeeds={openDeeds}
            language={language}
          />
          <NextToRise
            building={next}
            dayOne={dayOne}
            language={language}
            feeds={feeds}
            onOpen={openBuilding}
          />
          {growth.length > 0 ? (
            <SinceLastQuest growth={growth} buildings={scene.buildings} language={language} />
          ) : null}
          <Families
            families={families}
            risen={risen}
            next={next?.code ?? null}
            language={language}
            onOpen={openBuilding}
          />
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

      {/* Pinned outside the scroll: the status bar is transparent, so without this the list slid
          under the clock and the two read as one line. The scrim inside the painting only covers
          the painting, and it scrolls away with it. Invisible at rest (`statusScrimStyle`): drawn
          always, it was an opaque band across the top of a painting meant to run full-bleed. */}
      <Animated.View
        testID="village-status-scrim"
        pointerEvents="none"
        style={[
          { position: "absolute", top: 0, left: 0, right: 0, height: insets.top },
          statusScrimStyle,
        ]}
      >
        {/* Opaque: at 0.92 the list still read as ghost text behind the clock. */}
        <View style={{ flex: 1, backgroundColor: rawColors.bgDark }} />
      </Animated.View>

      {rewardOpen ? (
        <VillageReward
          growth={growth}
          buildings={scene.buildings}
          language={language}
          // Under the shield and the name, never over them: on a small screen half the hero
          // is still inside the title block.
          top={Math.max(Math.round(heroHeight * 0.5), titleTop + titleHeight + 8)}
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

      <CrestSheet
        view={crestView}
        crest={crest ?? null}
        onView={setCrestView}
        onClose={() => setCrestView(null)}
        onChanged={loadScene}
      />

      {sheetMounted ? (
        <VillageDetailSheet
          selected={selected}
          onClose={closeDetail}
          language={language}
          feeds={feeds}
          bottomInset={insets.bottom}
        />
      ) : null}
    </YStack>
  );
}
