import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useWindowDimensions } from "react-native";
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, XStack, YStack } from "tamagui";

import { FlameFlicker } from "@/components/common/FlameFlicker";
import { Skeleton } from "@/components/common/Skeleton";
import { BuiltBuildingCard } from "@/components/village/BuiltBuildingCard";
import { VillageDetailSheet, type VillageSelection } from "@/components/village/VillageDetailSheet";
import { VillageEmbers } from "@/components/village/VillageEmbers";
import {
  getAdventureAsset,
  getBuildingIconAsset,
  getSportSpriteAsset,
  getVillageTierAsset,
} from "@/constants/assetMap";
import { getDateTimeFormat } from "@/constants/dateFormatters";
import { rawColors } from "@/constants/rawColors";
import { pickDailyVariant } from "@/constants/restMessages";
import { VILLAGE_FLAVOUR } from "@/constants/villageFlavour";
import { dayKey } from "@/db/dates";
import { MUSCLE_LABELS } from "@/db/muscles";
import { getVillageScene, TIER_NAMES, type VillageScene as VillageSceneData } from "@/db/village";
import { useHaptics } from "@/hooks/useHaptics";
import { useAnimationProps, useReducedMotion } from "@/hooks/useReducedMotion";
import { localizedTitle } from "@/src/i18n/localized";
import { useSettingsStore } from "@/stores/settings";
import { useUserStore } from "@/stores/user";

/** The unbuilt icons read as silhouettes, not greyed-out buttons: same shape, no detail. */
const SILHOUETTE_TINT = rawColors.borderStrong;

/** The shelf is already newest-first; dating it turns the rack into the road travelled. */
const TROPHY_DATE_OPTIONS: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };

/** A defeated boss is the hardest trophy on the rack, so its medal is the one that shines. */
const MEDAL_BOSS = {
  bg: "$surface",
  borderColor: "$resourceGold",
  shadowColor: "$resourceGold",
  shadowRadius: 10,
  shadowOpacity: 0.55,
  shadowOffset: { width: 0, height: 0 },
  elevation: 6,
} as const;

const MEDAL_PLAIN = { bg: "$surface2", borderColor: "$borderStrong" } as const;

/**
 * How much slower the painting scrolls than the page. Low on purpose: the tier art is the one
 * thing on this screen that is supposed to feel like a place, and a strong parallax turns a
 * place into a carousel.
 */
const PARALLAX_FACTOR = 0.35;

export function VillageScene() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const language = useSettingsStore((s) => s.language);
  const villageName = useUserStore((s) => s.villageName);
  const sectionAnim = useAnimationProps("bouncy", { opacity: 0, y: 12 });
  const haptics = useHaptics();
  const reducedMotion = useReducedMotion();

  // The painting lags the page as it scrolls away. Written and read entirely on the UI thread:
  // `scrollY` is never touched from JS (docs/architecture/performance.md).
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  const parallax = useAnimatedStyle(() => ({
    transform: [{ translateY: reducedMotion ? 0 : scrollY.value * PARALLAX_FACTOR }],
  }));

  // Set once from the arrival params, never recomputed: a later tab-bar visit shouldn't
  // replay the "just grew" pulse for a building that grew several sessions ago.
  const { grown } = useLocalSearchParams<{ grown?: string }>();
  const [highlighted] = useState(() => new Set((grown ?? "").split(",").filter(Boolean)));

  const [scene, setScene] = useState<VillageSceneData | null>(null);
  // Read-only: a tap explains what earned the building, it never unlocks anything.
  const [selected, setSelected] = useState<VillageSelection | null>(null);
  // The sheet (portal, overlay, frame) is dead weight behind the scene until the first tap,
  // and has to outlive the selection afterwards or it would vanish instead of sliding shut.
  const [sheetMounted, setSheetMounted] = useState(false);

  const openDetail = (selection: VillageSelection) => {
    // Every other tappable surface in the app answers (session, onboarding); the village was the
    // one screen where taps were silent. `selection` is the lightest tick, not a reward buzz.
    haptics.selection();
    setSheetMounted(true);
    setSelected(selection);
  };

  // Refetch on focus: the whole point of this screen is "what changed since I trained",
  // and a tab screen stays mounted, so a mount-only effect would show yesterday forever.
  useFocusEffect(
    useCallback(() => {
      getVillageScene()
        .then(setScene)
        .catch(() => {
          // Keep whatever is on screen; the skeleton covers the first load
        });
    }, []),
  );

  // The tier art is square (1024x1024), and `cover` silently crops whatever the slot doesn't
  // match: the 4:3 this used to be threw away a quarter of every illustration — including the
  // beam crowning tier 5's palace. Matching the source puts the whole painting on screen.
  const heroHeight = width;

  if (!scene) {
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

  const tierName = TIER_NAMES[scene.tier][language === "fr" ? "fr" : "en"];
  const built = scene.buildings.filter((b) => b.level > 0);
  const unbuilt = scene.buildings.filter((b) => b.level === 0);
  const flavour = pickDailyVariant(
    VILLAGE_FLAVOUR[language === "fr" ? "fr" : "en"],
    `${dayKey(new Date())}:${scene.tier}`,
  );

  return (
    <YStack testID="village-screen" flex={1} bg="$background">
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {/* The scene is the screen: edge to edge, its own title, nothing framing it.
            `overflow="hidden"` is what keeps the parallaxed painting inside its own band
            instead of riding down over the tiles. */}
        <YStack width="100%" height={heroHeight} position="relative" overflow="hidden">
          {/* Only the painting lags — the scrims and the title stay anchored, so the art
              drifts behind the name rather than dragging it along. */}
          <Animated.View style={[{ width: "100%", height: "100%" }, parallax]}>
            <Image
              source={getVillageTierAsset(scene.tier)}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              transition={300}
            />
          </Animated.View>

          {/* Top scrim so the status bar stays readable over bright artwork */}
          <LinearGradient
            colors={["rgba(11,15,25,0.6)", "transparent"]}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: insets.top + 48,
            }}
          />

          {!!scene.dominantSport && (
            <YStack
              position="absolute"
              t={insets.top + 12}
              r="$4"
              width={56}
              height={56}
              rounded={28}
              overflow="hidden"
              borderWidth={2}
              borderColor="$primary"
              shadowColor="$shadowColor"
              shadowRadius={8}
              shadowOpacity={0.4}
            >
              <Image
                source={getSportSpriteAsset(scene.dominantSport.muscle)}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
              />
            </YStack>
          )}

          {/* Bottom scrim dissolves the artwork into the page; the title sits inside it */}
          <LinearGradient
            colors={["transparent", "rgba(11,15,25,0.75)", rawColors.bgDark]}
            locations={[0, 0.55, 1]}
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: Math.round(heroHeight * 0.6),
              justifyContent: "flex-end",
            }}
          >
            <YStack px="$4" pb="$3" gap="$1">
              <Text fontWeight="700" fontSize={28} color="$text" numberOfLines={1}>
                {villageName || tierName}
              </Text>
              <XStack items="center" gap="$3" flexWrap="wrap">
                <Text fontSize={14} color="$textSecondary">
                  {/* The tier only needs saying separately once the village has its own name */}
                  {villageName ? `${tierName} • ` : ""}
                  {t("village.level_line", {
                    level: scene.level,
                    defaultValue: `Level ${scene.level}`,
                  })}
                </Text>
                {scene.flame > 0 && (
                  <XStack items="center" gap="$1">
                    <FlameFlicker size={18} />
                    <Text fontSize={14} color="$text" fontWeight="700">
                      {t(`village.flame_${scene.flame}`, "")}
                    </Text>
                  </XStack>
                )}
              </XStack>
              {!!scene.dominantSport && (
                <Text fontSize={13} color="$textSecondary">
                  {t("village.dominant_sport", {
                    muscle:
                      MUSCLE_LABELS[scene.dominantSport.muscle]?.[
                        language === "fr" ? "fr" : "en"
                      ] ?? scene.dominantSport.muscle,
                    defaultValue: `Training focus: ${scene.dominantSport.muscle}`,
                  })}
                </Text>
              )}
              {/* The counterpart to the focus line above, and the only line here that asks for
                  something: it names a tile below that has stopped moving, and why. */}
              {!!scene.neglected && (
                <Text fontSize={13} color="$textSecondary">
                  {t("village.neglected_muscle", {
                    muscle:
                      MUSCLE_LABELS[scene.neglected]?.[
                        language === "fr" ? "fr" : "en"
                      ]?.toLowerCase() ?? scene.neglected,
                    defaultValue: `Least trained: ${scene.neglected}`,
                  })}
                </Text>
              )}
              {/* Weather, not a stat. Seeded by day *and* tier so it turns over at midnight and
                  reads differently once the village has grown. */}
              <Text fontSize={12} color="$muted" fontStyle="italic">
                {flavour}
              </Text>
            </YStack>
          </LinearGradient>

          {/* Last child on purpose: the bottom scrim is near-opaque over the lower half of the
              hero, so embers drawn before it would simply not be there. */}
          <VillageEmbers heroHeight={heroHeight} heroWidth={width} />
        </YStack>

        <YStack gap="$5" px="$4" pt="$4">
          {/* Empty hamlet: the wall of silhouettes below needs one line saying why it's bare */}
          {built.length === 0 && (
            <YStack testID="village-empty" gap="$2" {...sectionAnim}>
              <Text fontWeight="700" fontSize={16} color="$text">
                {t("village.empty_title", "Nothing built yet")}
              </Text>
              <Text fontSize={13} color="$textSecondary">
                {t(
                  "village.empty_subtitle",
                  "Your first quest will raise the first building here.",
                )}
              </Text>
            </YStack>
          )}

          {/* Built: derived from training, nothing to unlock by hand */}
          {built.length > 0 && (
            <YStack testID="village-built" gap="$3" {...sectionAnim}>
              <Text fontWeight="700" fontSize={16} color="$text">
                {t("village.built_title", "Built")}
              </Text>
              <XStack flexWrap="wrap" gap="$2">
                {built.map((building) => (
                  <BuiltBuildingCard
                    key={building.code}
                    building={building}
                    language={language}
                    justGrew={highlighted.has(building.code)}
                    onPress={() => openDetail({ kind: "building", building })}
                  />
                ))}
              </XStack>
            </YStack>
          )}

          {/* Still to come: silhouettes, so the village reads as unfinished, not as locked content */}
          {unbuilt.length > 0 && (
            <YStack testID="village-to-build" gap="$3" {...sectionAnim}>
              <Text fontWeight="700" fontSize={16} color="$textSecondary">
                {t("village.to_build_title", "To build")}
              </Text>
              <XStack flexWrap="wrap" gap="$3">
                {unbuilt.map((building) => (
                  <YStack
                    key={building.code}
                    width="22%"
                    items="center"
                    gap="$1"
                    onPress={() => openDetail({ kind: "building", building })}
                    pressStyle={{ opacity: 0.85 }}
                    accessibilityRole="button"
                    accessibilityLabel={language === "fr" ? building.frName : building.enName}
                  >
                    <YStack
                      width={52}
                      height={52}
                      rounded={26}
                      bg="$surface"
                      items="center"
                      justify="center"
                    >
                      <Image
                        source={getBuildingIconAsset(building.code, building.relatedMuscle)}
                        style={{ width: 30, height: 30 }}
                        contentFit="contain"
                        tintColor={SILHOUETTE_TINT}
                      />
                    </YStack>
                    <Text
                      fontSize={11}
                      color="$muted"
                      numberOfLines={1}
                      style={{ textAlign: "center" }}
                    >
                      {language === "fr" ? building.frName : building.enName}
                    </Text>
                  </YStack>
                ))}
              </XStack>
            </YStack>
          )}

          {/* Trophy shelf: achievements + defeated bosses on one rack, newest first */}
          {scene.trophies.length > 0 && (
            <YStack gap="$3" {...sectionAnim}>
              <Text fontWeight="700" fontSize={16} color="$text">
                {t("village.trophies_title", "Trophies")}
              </Text>
              {/* A wall, not a rail: the whole rack is visible at once, same wrapping grid
                  as the buildings above, instead of hiding older medals off-screen. */}
              <XStack flexWrap="wrap" gap="$3">
                {scene.trophies.map((trophy) => (
                  <YStack
                    key={trophy.key}
                    width="22%"
                    items="center"
                    gap="$2"
                    onPress={() => openDetail({ kind: "trophy", trophy })}
                    pressStyle={{ opacity: 0.85 }}
                    accessibilityRole="button"
                    accessibilityLabel={localizedTitle(trophy, language)}
                  >
                    {/* One medal disc for both kinds; only the rim says which. A defeated
                        boss is the hardest trophy on the rack, so it alone keeps a glow. */}
                    <YStack
                      width={56}
                      height={56}
                      rounded={28}
                      overflow="hidden"
                      items="center"
                      justify="center"
                      borderWidth={2}
                      {...(trophy.kind === "boss" ? MEDAL_BOSS : MEDAL_PLAIN)}
                    >
                      {trophy.imagePath ? (
                        <Image
                          source={getAdventureAsset(trophy.imagePath)}
                          style={{ width: "100%", height: "100%" }}
                          contentFit="cover"
                        />
                      ) : (
                        <Text fontSize={28}>{trophy.emoji}</Text>
                      )}
                    </YStack>
                    <Text
                      fontSize={11}
                      color="$textSecondary"
                      numberOfLines={2}
                      style={{ textAlign: "center" }}
                    >
                      {localizedTitle(trophy, language)}
                    </Text>
                    <Text fontSize={10} color="$muted">
                      {getDateTimeFormat(language, TROPHY_DATE_OPTIONS).format(trophy.earnedAt)}
                    </Text>
                  </YStack>
                ))}
              </XStack>
            </YStack>
          )}
        </YStack>
      </Animated.ScrollView>

      {sheetMounted ? (
        <VillageDetailSheet
          selected={selected}
          onClose={() => setSelected(null)}
          language={language}
          bottomInset={insets.bottom}
        />
      ) : null}
    </YStack>
  );
}
