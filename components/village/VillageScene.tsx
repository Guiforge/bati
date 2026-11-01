import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { lockAsync, OrientationLock, unlockAsync } from "expo-screen-orientation";
import { type ComponentProps, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AccessibilityInfo,
  type LayoutChangeEvent,
  PixelRatio,
  Pressable,
  StyleSheet,
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
import { TITLE_BLOCK } from "@/components/chorus/cameoAnchor";
import { VillagerCameo } from "@/components/chorus/VillagerCameo";
import { AppButton } from "@/components/common/AppButton";
import { FlameFlicker } from "@/components/common/FlameFlicker";
import { Recitatif } from "@/components/common/Recitatif";
import { Skeleton } from "@/components/common/Skeleton";
import { Banners } from "@/components/village/Banners";
import { Crest } from "@/components/village/Crest";
import { CrestSheet, type CrestView } from "@/components/village/CrestSheet";
import { crestFootprint } from "@/components/village/crestGeometry";
import { revealedToday, useCrestLine } from "@/components/village/crestLine";
import { Bulle, ContenuBatiment, ContenuVillageois } from "@/components/village/iso/Bulle";
import { apresTap, HAUTEUR_BARRE, type Ouverture } from "@/components/village/iso/bulle";
import { aireDepuisFenetre, dispositionIso } from "@/components/village/iso/disposition";
import { prendreFete } from "@/components/village/iso/habitants";
import type { Croissance, IsoVillage } from "@/components/village/iso/IsoVillage";
import { choisirLumiere } from "@/components/village/iso/lumiere";
import { jourDe } from "@/components/village/iso/marcheurs";
import { revelation } from "@/components/village/iso/revelation";
import type { MemoireCamera } from "@/components/village/iso/useCameraIso";
import { groupFamilies, nameOf } from "@/components/village/rows";
import { VillageDetailSheet, type VillageSelection } from "@/components/village/VillageDetailSheet";
import { VillageBandeau, VillageDrawer } from "@/components/village/VillageDrawer";
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
import { INTEGRATION } from "@/constants/isoPoc";
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
import type { BuildingCode } from "@/db/schema";
import { formatCount } from "@/db/targets";
import {
  type ClaimedStages,
  claimable,
  claimStage,
  drawnLevel,
  getClaimedStages,
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
import { loadVillageYears, type VillageYearsView } from "@/db/villageYears";
import { useHaptics } from "@/hooks/useHaptics";
import { useAnimationProps, useReducedMotion } from "@/hooks/useReducedMotion";
import { JOUR_SEUL } from "@/src/distribution";
import { reportError } from "@/src/reportError";
import { playHit } from "@/src/sounds";
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
      fontFamily="heading"
      fontWeight="700"
      fontSize={30}
      lineHeight={`${TITLE_LINE}px`}
      color="text"
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
        <YStack width={6} height={10} rounded={999} bg="text" />
        <YStack width={6} height={10} rounded={999} bg="text" />
      </XStack>
    </YStack>
  );
}

/** The title block's own box: the loaded header and its skeleton share it, so nothing slides. */
const TITLE_BLOCK_STYLE = { px: "4", pb: 28, gap: 6 } as const;
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

// Required on render, not imported: IsoVillage drags in the mock-up index (87 images) and
// isoSpec.json, which must stay unevaluated while the flag is off.
function IsoVillageLazy(props: ComponentProps<typeof IsoVillage<VillageBuilding>>) {
  const { IsoVillage: Carte } = require("@/components/village/iso/IsoVillage") as {
    IsoVillage: typeof IsoVillage;
  };
  return <Carte {...props} />;
}

/** `iso` shows the iso map instead of the tier's painting; it defaults to the production flag, and only the dev route (app/dev-iso.tsx) overrides it. */
export function VillageScene({ iso = INTEGRATION }: { iso?: boolean } = {}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const language = useSettingsStore((s) => s.language);
  const lang = language;
  const villageName = useUserStore((s) => s.villageName);
  const sectionAnim = useAnimationProps("bouncy", { opacity: 0, y: 12 });
  const haptics = useHaptics();
  const hapticsEnabled = useSettingsStore((s) => s.hapticsEnabled);
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const reducedMotion = useReducedMotion();

  // The painting lags the page as it scrolls away. Written and read entirely on the UI thread:
  // `scrollY` is never touched from JS (docs/architecture/performance.md).
  const scrollY = useSharedValue(0);
  const zoom = useSharedValue(1);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

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
  // The screen's own area (the tab bar and the content column excluded), which the iso map is laid
  // out in; the window until the first layout.
  const [area, setArea] = useState<{ w: number; h: number } | null>(null);
  const measureArea = (e: LayoutChangeEvent) =>
    setArea({
      w: Math.round(e.nativeEvent.layout.width),
      h: Math.round(e.nativeEvent.layout.height),
    });
  // The iso map is mounted once, in both orientations; this is only a net should it ever remount.
  const cameraMemory = useRef<MemoireCamera | undefined>(undefined);
  const [loadFailed, setLoadFailed] = useState(false);
  // Read-only: a tap explains what earned the building, it never unlocks anything.
  const [selected, setSelected] = useState<VillageSelection | null>(null);
  // The stages claimed so far (iso map on), and the claim whose site is playing: its new levels
  // show on the map from the first frame, and are written only when the site is over.
  const [claimed, setClaimed] = useState<ClaimedStages>({});
  const [pending, setPending] = useState<ClaimedStages | null>(null);
  // Whether the stages were read this visit: the automatic evolution waits for them.
  const [claimedRead, setClaimedRead] = useState(false);
  // Reduced motion plays no scene: this sentence says it instead (and TalkBack reads it).
  const [evolved, setEvolved] = useState<string | null>(null);
  // The sheet (portal, overlay, frame) is dead weight behind the scene until the first tap,
  // and has to outlive the selection afterwards or it would vanish instead of sliding shut.
  const [sheetMounted, setSheetMounted] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  // The iso page's drawer (T45): the list and the tier, behind the strip at the foot of the map.
  // Mounted at the first opening only, like the detail sheet, and kept to slide shut.
  const [drawerMounted, setDrawerMounted] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [rewardOpen, setRewardOpen] = useState(false);
  const [crestView, setCrestView] = useState<CrestView | null>(null);
  // Stones and banners, replayed from the journal: read after the scene (its XP keys the memo)
  // and never failing it, like the crest. Unread, the Seasons and the stones are simply absent.
  const [yearsView, setYearsView] = useState<VillageYearsView | null>(null);

  // Stable: the sheet subscribes to hardware back on it, and a fresh identity every render
  // would resubscribe every render.
  const closeDetail = useCallback(() => setSelected(null), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const openDrawer = () => {
    haptics.selection();
    setDrawerMounted(true);
    setDrawerOpen(true);
  };
  // The iso map's bubble (T14): what it is about, and whether its shell was ever mounted (like the
  // sheet's, dead weight until the first tap). The map fills `viseur` for the bubble's outside tap.
  const [bulle, setBulle] = useState<Ouverture | null>(null);
  const [bulleMontee, setBulleMontee] = useState(false);
  const viseur = useRef<((x: number, y: number) => Ouverture | null) | undefined>(undefined);
  /** The one door to the bubble: a tap on the map, its outside tap, and T26's villagers. */
  const ouvrirBulle = (o: Ouverture | null) => {
    if (o) {
      haptics.selection();
      setBulleMontee(true);
    }
    setBulle(o);
  };
  // Stable, like closeDetail: the bubble subscribes to hardware back on it.
  const fermerBulle = useCallback(() => setBulle(null), []);

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
    // Flag off: the claimed stages are neither read nor written, the village is as it was.
    if (iso) {
      getClaimedStages()
        .then((stages) => {
          if (mine !== loadId.current) return;
          setClaimed(stages);
          setClaimedRead(true);
        })
        .catch((error) => reportError("village.claimed", error));
    }
    Promise.all([getVillageScene(), readCrest, readFeeds])
      .then(([data, crestData, feedsData]) => {
        if (mine !== loadId.current) return;
        setScene(data);
        if (feedsData !== null) setFeeds(feedsData);
        // An unreadable crest after a drawn one keeps the drawn one, like the scene keeps yesterday's.
        if (crestData !== undefined) crestRead.current = true;
        if (crestData !== undefined || !crestRead.current) setCrest(crestData);
        setLoadFailed(false);
        loadVillageYears(data.totalXp, crestData?.animal ?? null)
          .then((view) => {
            if (mine === loadId.current) setYearsView(view);
          })
          .catch((error) => reportError("village.years", error));
      })
      .catch((error) => {
        if (mine !== loadId.current) return;
        // This is the tab's only fetch: without the failed flag, a first-load failure
        // left the skeleton on screen forever. Later failures keep yesterday's scene.
        reportError("village.scene", error);
        setLoadFailed(true);
      });
  }, [iso]);

  // Tab screens stay mounted, so a revisit inherited whatever offset the last visit left. The
  // scene *is* the screen, so a fresh visit starts at the top. Safe: the detail sheet and viewer
  // are modals, not routes, so focus only changes when actually leaving the tab.
  const scrollRef = useAnimatedRef<Animated.ScrollView>();

  // The village screen may turn (L6-T21), with the iso map only and the flag on: every other screen,
  // and this one without the map, stays in the portrait app.json asks for.
  const turns = INTEGRATION && iso;
  useFocusEffect(
    useCallback(() => {
      if (!turns) return;
      unlockAsync().catch((error) => reportError("village.orientation", error));
      return () => {
        lockAsync(OrientationLock.PORTRAIT_UP).catch((error) =>
          reportError("village.orientation", error),
        );
      };
    }, [turns]),
  );

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
  // The iso map frames the building itself, so the painting does not also lean in.
  const focus =
    scene && !iso ? VILLAGE_ANCHORS[scene.tier].find((a) => risen.has(a.code)) : undefined;
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
  // The iso map's party (T26): handed the session key once, even if the screen remounts with `grown` still set.
  const [fete, setFete] = useState(() => prendreFete(grown));
  useEffect(() => {
    const cle = prendreFete(grown);
    if (cle) setFete(cle);
  }, [grown]);
  const playedFor = useRef<string | undefined>(undefined);
  const [croissance, setCroissance] = useState<Croissance | undefined>(undefined);
  useEffect(() => {
    // Iso: the map plays the growth itself (camera, site, caption) and the golden card stays away.
    if (iso || !ready || parseGrown(grown).length === 0 || playedFor.current === grown) return;
    playedFor.current = grown;
    // The iso map plays its own growth (camera, cross-fade, spring) and drops this when done.
    // Iso map on: the "ready to improve" signal replaces the growth that played on return.
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
  }, [iso, ready, grown, reducedMotion, zoom]);

  const shownStages = { ...claimed, ...pending };
  const upgradable = iso && scene ? claimable(scene.buildings, shownStages) : [];
  const readySet = new Set(upgradable);
  // One site for the whole claim (the map plays the first two, the others show their new stage),
  // and one write when it is over. Unmounted before that, nothing is written and they stay ready.
  const claim = (codes: readonly BuildingCode[]) => {
    if (!scene || croissance) return;
    const items = scene.buildings.filter((b) => codes.includes(b.code));
    if (items.length === 0) return;
    haptics.selection();
    setEvolved(null);
    setPending(Object.fromEntries(items.map((b) => [b.code, b.level])));
    setCroissance({
      cle: `claim:${Date.now()}`,
      items: items.map((b) => ({ code: b.code, oldLevel: drawnLevel(b, shownStages) })),
    });
    claimDone.current = items;
  };
  const claimDone = useRef<VillageBuilding[]>([]);
  const finishCroissance = () => {
    setCroissance(undefined);
    const items = claimDone.current;
    claimDone.current = [];
    if (items.length === 0) return;
    if (reducedMotion) {
      const line =
        items.length === 1 && items[0]
          ? t("village.evolve_done", { name: nameOf(items[0], language) })
          : t("village.evolve_done_all");
      setEvolved(line);
      AccessibilityInfo.announceForAccessibility(line);
    }
    claimStage(items)
      .then(setClaimed)
      .catch((error) => reportError("village.claim", error))
      .finally(() => setPending(null));
  };

  // Keeps the claimed stages true to what was on screen (VI-29), in one write. A building that was
  // ready before the session that has just been counted evolves by itself, without a scene: it is
  // brought up to where it stood before the session. A building the key does not know yet is
  // written at the level it stood at before the session, so what the session earned becomes ready;
  // and the very first time (an empty key) every built building is written at its present level,
  // so switching the flag on changes nothing on screen. Once per `grown`, marked after the write.
  const autoFor = useRef<string | undefined>(undefined);
  const autoBusy = useRef(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: `grown` stands for the session
  useEffect(() => {
    if (!(iso && scene && claimedRead) || autoBusy.current || autoFor.current === (grown ?? "")) {
      return;
    }
    const key = grown ?? "";
    const before = new Map(growth.map((g) => [g.code, g.oldLevel]));
    const previous = scene.buildings.map((b) => ({
      code: b.code,
      level: before.get(b.code) ?? b.level,
    }));
    const empty = Object.keys(claimed).length === 0;
    const ready = new Set(growth.length > 0 ? claimable(previous, claimed) : []);
    const items = previous.filter(
      (b) =>
        ready.has(b.code) ||
        (b.level > 0 && claimed[b.code] === undefined && (empty || before.has(b.code))),
    );
    if (items.length === 0) {
      autoFor.current = key;
      return;
    }
    autoBusy.current = true;
    claimStage(items)
      .then((stages) => {
        autoFor.current = key;
        setClaimed(stages);
      })
      .catch((error) => reportError("village.autoEvolve", error))
      .finally(() => {
        autoBusy.current = false;
      });
  }, [iso, scene, claimedRead, grown]);

  const dismissReward = () => {
    setRewardOpen(false);
    zoom.set(withTiming(1, LEAN));
  };

  // The column, not the window. The tab scene is capped at CONTENT_MAX_WIDTH and
  // `useWindowDimensions` cannot see that: on a tablet it reports 800 where the painting has 520
  // to fill, which both cuts the square off at the column edge and trips the compact band for a
  // window that does not need it.
  const columnWidth = Math.min(width, CONTENT_MAX_WIDTH);
  // The iso map is the whole page less the drawer's strip, in both orientations (T45); the list is
  // in the drawer. The window turns before the area's onLayout comes back: an area that no longer
  // fits in the window is the last orientation's, and laying the map out in it kept the old layout
  // ~0.5 s (qa).
  const areaFits = area !== null && area.w <= width + 1 && area.h <= height + 1;
  const aire = areaFits ? area : aireDepuisFenetre(width, height, HAUTEUR_BARRE, insets.bottom);
  const layout = dispositionIso(aire.w, aire.h);
  const landscape = iso && layout.paysage;
  const paintingMotion = useAnimatedStyle(() => ({
    transform: [
      { translateY: reducedMotion ? 0 : scrollY.value * PARALLAX_FACTOR },
      { scale: zoom.value },
    ],
  }));
  // The iso hero spans the screen's measured width (no 520 column on the Village tab, flag on).
  const sceneWidth = iso ? layout.carteW : columnWidth;
  const slot = villageHeroSlot(columnWidth, height);
  const bandHeight = iso ? layout.carteH : slot.heroHeight;
  const { paintingTop } = slot;
  // The name is pinned from the top, so what sits under it (a Focus line that day one lacks, a
  // two-line animal sentence) can only push the hero longer, never move the name.
  // Iso: the map has its own box, so a title taller than the usual block climbs instead of growing it.
  const titleTop = iso
    ? Math.max(insets.top + 8, bandHeight - Math.max(titleHeight, TITLE_BLOCK))
    : villageTitleTop(bandHeight, insets.top);
  const heroHeight = iso ? bandHeight : Math.max(bandHeight, titleTop + titleHeight);
  // The iso map fills the hero like the painting, under the title; its framing keeps the foot free.
  // A third of the title block: the island's foot goes under the crest and the name, in the scrim.
  const isoMarge = Math.round((heroHeight - titleTop) / 3);

  if (!scene) {
    if (loadFailed) {
      return (
        <YStack
          testID="village-screen"
          flex={1}
          bg="background"
          items="center"
          justify="center"
          gap="4"
          p="4"
        >
          <Text fontSize={16} fontWeight="700" color="text" style={{ textAlign: "center" }}>
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
      <YStack testID="village-screen" flex={1} bg="background" onLayout={measureArea}>
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
                bg="surface2"
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
        <YStack gap="3" p="4">
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

  const openCrestWhy = () => {
    haptics.selection();
    setCrestView("why");
  };
  const villageTitle = villageName || tierName;
  // The level line's parts, shown with the level in bold and spoken whole.
  const levelHead = `${villageName ? `${tierName} · ` : ""}${beforeLevel}`;
  const levelTail = `${afterLevel} · ${scene.title[lang]}`;
  const flameLine =
    scene.flame > 0
      ? `${t(`village.flame_${scene.flame}`)} · ${t("village.flame_days", { days: formatCount(language, scene.streakDays) })}`
      : null;
  const focusLine = scene.dominantSport
    ? t("village.focus_line", { muscle: MUSCLE_LABELS[scene.dominantSport.muscle][lang] })
    : null;
  const titleContent = (
    <>
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
            onPress={openCrestWhy}
          >
            <Crest crest={crest} size={CREST_SIZE} onPainting />
          </Pressable>
        )}
        {/* The chip wraps under the name when the row is full: a long name takes two
            lines and nothing is cut. */}
        <XStack testID="village-name-row" {...nameRow()}>
          {iso ? (
            // The BD caption box over the map (T04): never cut, a long name wraps inside it.
            <YStack shrink={1} minW={0}>
              {/* One word: Android would split it mid-word at 200 % font, so it shrinks. */}
              <Recitatif
                testID="village-name-cartouche"
                numberOfLines={/[\s-]/.test(villageTitle.trim()) ? undefined : 1}
                adjustsFontSizeToFit={!/[\s-]/.test(villageTitle.trim())}
              >
                {villageTitle.replace(/-/g, "-\u200B")}
              </Recitatif>
            </YStack>
          ) : (
            <TitleText>{villageTitle}</TitleText>
          )}
          {scene.flame > 0 && (
            <XStack
              items="center"
              gap={5}
              px={9}
              py={3}
              rounded={999}
              bg="glassBg"
              borderWidth={1}
              borderColor="glassBorder"
            >
              <FlameFlicker size={14} />
              <Text fontSize={11.5} fontWeight="600" color="text" numberOfLines={1}>
                {flameLine}
              </Text>
            </XStack>
          )}
        </XStack>
      </XStack>
      <Text fontSize={13} lineHeight={`${TEXT_LINE}px`} fontWeight="500" color="textSecondary">
        {levelHead}
        <Text fontWeight="700">{scene.level}</Text>
        {levelTail}
      </Text>
      {crest === undefined ? null : (
        <Text testID="village-crest-line" fontSize={13} lineHeight={`${TEXT_LINE}px`} color="text">
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
          <Text fontSize={11.5} color="textSecondary">
            {focusLine}
          </Text>
        </XStack>
      ) : null}
    </>
  );
  // The map's light, behind the flag (T15): the channel and the hour choose it; the hour is read at
  // render, so a map kept open across 7:00 or 20:00 changes at its next render.
  // shortcut: `plus` is false, Bati+ does not exist yet; wire its entitlement here when it does.
  const lumiere = INTEGRATION
    ? choisirLumiere({ jourSeul: JOUR_SEUL, plus: false, heure: new Date().getHours() })
    : "nuit";
  const isoMap = (mapWidth: number, mapHeight: number, marge: number) => (
    <IsoVillageLazy
      tier={scene.tier}
      buildings={scene.buildings}
      width={mapWidth}
      height={mapHeight}
      margeBas={marge}
      onOpen={openBuilding}
      onBulle={ouvrirBulle}
      viseur={viseur}
      croissance={croissance}
      onCroissanceFinie={finishCroissance}
      onRevelation={() =>
        revelation(
          { hapticsEnabled, soundEnabled },
          { vibrer: haptics.lightImpact, marteau: playHit },
        )
      }
      reclamables={upgradable}
      niveauxReclames={shownStages}
      memoire={cameraMemory}
      lumiere={lumiere}
      blason={crest === undefined ? undefined : { crest, onPress: openCrestWhy }}
      fete={fete}
      sonActif={soundEnabled}
    />
  );
  // The bottom 14 is what the panel below overlaps (painting). The focus line comes last, where the
  // scrim is darkest: above the name it sat on the bright top of the painting (an aurora on tier 12),
  // secondary text on pale turquoise. The flame shares the name's line, which gives the panel back
  // a whole row. Its box is the skeleton's.
  const heroTitle = (
    <YStack
      testID="village-title"
      // The map under the title keeps its drags; the crest keeps its press. Iso: spoken in reading
      // order, after the drawer's strip, which comes first in the tree.
      pointerEvents="box-none"
      importantForAccessibility="auto"
      position="absolute"
      t={titleTop}
      l={0}
      r={landscape ? "50%" : 0}
      {...TITLE_BLOCK_STYLE}
      onLayout={measureTitle}
    >
      {titleContent}
    </YStack>
  );
  // What lies over the painting or the map, in the hero: scrims, embers, title, the villager.
  const heroLayers = (
    <>
      {/* Top scrim so the status bar stays readable over bright artwork */}
      <LinearGradient
        pointerEvents="none"
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
        pointerEvents="none"
        colors={["transparent", rawColors.bgOverlay, rawColors.bgDark]}
        locations={iso ? [0, 0.8, 1] : [0, 0.66, 0.94]}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          // Iso: the title's part only, so the map stays lit under a light overlay.
          height: iso
            ? heroHeight - titleTop + 24
            : Math.max(Math.round(heroHeight * 0.62), heroHeight - titleTop + 24),
        }}
      />

      {/* Handed only the part of the hero above the title: a mote that started inside the
      title block fell on the status line and read as a full stop ("Divin ."). */}
      {/* Under the title, over the scrim: the scrim is near-opaque over the lower half of the
      hero, so embers drawn before it would simply not be there, and one drawn over the
      title fell on the crest and read as a ring. */}
      <VillageEmbers heroHeight={titleTop} heroWidth={sceneWidth} tier={scene.tier} />

      {heroTitle}

      {/* The one floating villager in the app: part of the painting, above the title, so it
      scrolls with it and the cards below are never under it. Its zone is this band. */}
      <VillagerCameo band={villageCameoBand(width, height, insets.top)} />
    </>
  );

  // What the list showed, in one place: the painting's page scrolls it under the scene, the iso page
  // keeps it in the drawer. Leaving the drawer first lets the map show what the tap does.
  const openFromList = (building: VillageBuilding) => {
    setDrawerOpen(false);
    openBuilding(building);
  };
  const claimFromList = (codes: readonly BuildingCode[]) => {
    setDrawerOpen(false);
    claim(codes);
  };
  const evolvedLine = evolved ? (
    <Text
      testID="village-evolved"
      accessibilityLiveRegion="polite"
      fontSize={13}
      color="resourceGold"
    >
      {evolved}
    </Text>
  ) : null;
  const panel = (
    <>
      <VillageTier
        progress={getTierProgress(scene.level, scene.totalXp)}
        name={villageName || tierName}
        complete={complete}
        openDeeds={openDeeds}
        language={language}
      />
      {evolved && !iso ? evolvedLine : null}
      {upgradable.length >= 2 ? (
        <AppButton
          testID="village-claim-all"
          variant="outline"
          onPress={() => claimFromList(upgradable)}
          accessibilityRole="button"
          accessibilityLabel={t("village.claim_all")}
        >
          {t("village.claim_all")}
        </AppButton>
      ) : null}
      <NextToRise
        building={next}
        dayOne={dayOne}
        language={language}
        feeds={feeds}
        onOpen={openFromList}
      />
      {growth.length > 0 ? (
        <SinceLastQuest growth={growth} buildings={scene.buildings} language={language} />
      ) : null}
      <Families
        families={families}
        risen={risen}
        next={next?.code ?? null}
        language={language}
        stones={yearsView?.years.stones.length ?? 0}
        ready={readySet}
        onClaim={(building) => claimFromList([building.code])}
        onOpen={openFromList}
      />
      {yearsView ? (
        <Banners banners={yearsView.years.banners} names={yearsView.names} language={lang} />
      ) : null}
      <YStack gap={6}>
        <Text fontSize={12} lineHeight="17px" color="textSecondary" fontStyle="italic">
          {weather}
        </Text>
        <Text fontSize={11.5} lineHeight="17px" color="textSecondary" opacity={0.75}>
          {t("village.foot")}
        </Text>
      </YStack>
    </>
  );

  return (
    <YStack testID="village-screen" flex={1} bg="background" onLayout={measureArea}>
      {iso ? (
        <>
          {/* The strip comes first in the tree, so TalkBack reads it before anything else; map and
              strip do not overlap, so no zIndex is needed to draw them (Fabric reads zIndex order). */}
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              flexDirection: "column-reverse",
            }}
          >
            <VillageBandeau tier={scene.tier} onPress={openDrawer} />
            {/* Reduced motion plays no scene: the sentence stays on the page, over the strip, since
                the drawer the claim came from is closed by then. */}
            {evolvedLine ? (
              <YStack bg="bgDark" px="4" pt="2">
                {evolvedLine}
              </YStack>
            ) : null}
          </View>
          <View
            testID={landscape ? "village-map-side" : "village-hero"}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: layout.carteW,
              height: layout.carteH,
              overflow: "hidden",
            }}
          >
            {isoMap(layout.carteW, layout.carteH, isoMarge)}
            {heroLayers}
          </View>
        </>
      ) : (
        <XStack flex={1}>
          <Animated.ScrollView
            ref={scrollRef}
            testID="village-scroll"
            style={{ flex: 1 }}
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
                    width: sceneWidth,
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
              {heroLayers}
            </YStack>

            {/* The panel rides up over the painting's last 14 dp, so the list reads as the scene's
              own ground rather than a second screen stacked under it. */}
            <YStack
              bg="bgDark"
              borderTopWidth={1}
              borderColor="glassBorder"
              borderTopLeftRadius={16}
              borderTopRightRadius={16}
              px="4"
              pt="4"
              gap={18}
              mt={-14}
              {...sectionAnim}
            >
              {panel}
            </YStack>
          </Animated.ScrollView>
        </XStack>
      )}

      {/* Pinned outside the scroll: the status bar is transparent, so without this the list slid
          under the clock and the two read as one line. The scrim inside the painting only covers
          the painting, and it scrolls away with it. Iso: no scroll, the map's own top scrim does it. Invisible at rest (`statusScrimStyle`): drawn
          always, it was an opaque band across the top of a painting meant to run full-bleed. */}
      {iso ? null : (
        <Animated.View
          testID="village-status-scrim"
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: insets.top,
              zIndex: 2,
            },
            statusScrimStyle,
          ]}
        >
          {/* Opaque: at 0.92 the list still read as ghost text behind the clock. */}
          <View style={{ flex: 1, backgroundColor: rawColors.bgDark }} />
        </Animated.View>
      )}

      {rewardOpen ? (
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <VillageReward
            growth={growth}
            buildings={scene.buildings}
            language={language}
            // Under the shield and the name, never over them: on a small screen half the hero
            // is still inside the title block.
            top={Math.max(Math.round(heroHeight * 0.5), titleTop + titleHeight + 8)}
            onDismiss={dismissReward}
          />
        </View>
      ) : null}

      {viewerOpen ? (
        <VillageSceneViewer
          tier={scene.tier}
          title={villageName || tierName}
          onClose={() => setViewerOpen(false)}
        />
      ) : null}

      {drawerMounted ? (
        <VillageDrawer open={drawerOpen} onClose={closeDrawer}>
          {panel}
        </VillageDrawer>
      ) : null}

      <CrestSheet
        view={crestView}
        crest={crest ?? null}
        onView={setCrestView}
        onClose={() => setCrestView(null)}
        onChanged={loadScene}
      />

      {iso && bulleMontee ? (
        <Bulle
          ouverte={bulle}
          onClose={fermerBulle}
          onDehors={(x, y) => ouvrirBulle(apresTap(bulle, viseur.current?.(x, y) ?? null))}
          contenu={(o, nom) => {
            if (o.cible.type === "villageois")
              return (
                <ContenuVillageois
                  id={o.cible.id}
                  role={o.cible.role}
                  habitant={o.cible.habitant}
                  jour={jourDe(Date.now(), new Date().getTimezoneOffset())}
                  nom={nom}
                />
              );
            const { code } = o.cible;
            const building = scene.buildings.find((b) => b.code === code);
            return building ? (
              <ContenuBatiment
                building={building}
                pret={readySet.has(building.code)}
                nom={nom}
                language={language}
                feeds={feeds}
                years={yearsView}
                onClose={fermerBulle}
                onClaim={(b) => claim([b.code])}
              />
            ) : null;
          }}
        />
      ) : null}

      {sheetMounted ? (
        <VillageDetailSheet
          selected={selected}
          onClose={closeDetail}
          language={language}
          feeds={feeds}
          years={yearsView}
          ready={readySet}
          onClaim={(building) => claim([building.code])}
          bottomInset={insets.bottom}
        />
      ) : null}
    </YStack>
  );
}
