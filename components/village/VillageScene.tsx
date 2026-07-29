import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, XStack, YStack } from "tamagui";

import { Card } from "@/components/common/Card";
import { FlameFlicker } from "@/components/common/FlameFlicker";
import { Skeleton } from "@/components/common/Skeleton";
import {
  getAdventureAsset,
  getBuildingIconAsset,
  getSportSpriteAsset,
  getVillageTierAsset,
} from "@/constants/assetMap";
import { MUSCLE_LABELS } from "@/db/muscles";
import { getVillageScene, TIER_NAMES, type VillageScene as VillageSceneData } from "@/db/village";
import { useAnimationProps } from "@/hooks/useReducedMotion";
import { useSettingsStore } from "@/stores/settings";
import { useUserStore } from "@/stores/user";

const PIP_SLOTS = [1, 2, 3, 4, 5] as const;
/** The unbuilt icons read as silhouettes, not greyed-out buttons: same shape, no detail. */
const SILHOUETTE_TINT = "#2A3360";

/** Level 1..5 as filled pips — a number would compete with the scene, five dots don't. */
function LevelPips({ level }: { level: number }) {
  return (
    <XStack gap={3} items="center">
      {PIP_SLOTS.map((slot) => (
        <YStack
          key={slot}
          width={5}
          height={5}
          rounded={3}
          bg={slot <= level ? "$primary" : "$borderStrong"}
        />
      ))}
    </XStack>
  );
}

export function VillageScene() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const language = useSettingsStore((s) => s.language);
  const villageName = useUserStore((s) => s.villageName);
  const sectionAnim = useAnimationProps("bouncy", { opacity: 0, y: 12 });

  const [scene, setScene] = useState<VillageSceneData | null>(null);

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

  // The tier art is 4:3; matching it means the scene fills the width with nothing cropped.
  const heroHeight = Math.round(width * 0.75);

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

  return (
    <YStack testID="village-screen" flex={1} bg="$background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        {/* The scene is the screen: edge to edge, its own title, nothing framing it */}
        <YStack width="100%" height={heroHeight} position="relative">
          <Image
            source={getVillageTierAsset(scene.tier)}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            transition={300}
          />

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
            colors={["transparent", "rgba(11,15,25,0.75)", "#0B0F19"]}
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
            </YStack>
          </LinearGradient>
        </YStack>

        <YStack gap="$5" px="$4" pt="$4">
          {/* Built: derived from training, nothing to unlock by hand */}
          {built.length > 0 && (
            <YStack testID="village-built" gap="$3" {...sectionAnim}>
              <Text fontWeight="700" fontSize={16} color="$text">
                {t("village.built_title", "Built")}
              </Text>
              <XStack flexWrap="wrap" gap="$2">
                {built.map((building) => (
                  <Card
                    flat
                    key={building.code}
                    bg="$surface"
                    width="31.5%"
                    p="$3"
                    gap="$2"
                    items="center"
                  >
                    <Image
                      source={getBuildingIconAsset(building.code, building.relatedMuscle)}
                      style={{ width: 48, height: 48 }}
                      contentFit="contain"
                    />
                    <Text
                      fontSize={12}
                      fontWeight="700"
                      color="$text"
                      numberOfLines={1}
                      style={{ textAlign: "center" }}
                    >
                      {language === "fr" ? building.frName : building.enName}
                    </Text>
                    <LevelPips level={building.level} />
                  </Card>
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
                  <YStack key={building.code} width="22%" items="center" gap="$1">
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
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12, paddingRight: 16 }}
              >
                {scene.trophies.map((trophy) => (
                  <YStack key={trophy.key} width={80} items="center" gap="$2">
                    {trophy.imagePath ? (
                      <YStack
                        width={56}
                        height={56}
                        rounded={28}
                        overflow="hidden"
                        borderWidth={2}
                        borderColor="$primary"
                      >
                        <Image
                          source={getAdventureAsset(trophy.imagePath)}
                          style={{ width: "100%", height: "100%" }}
                          contentFit="cover"
                        />
                      </YStack>
                    ) : (
                      <YStack
                        width={56}
                        height={56}
                        rounded={28}
                        bg="$surface"
                        items="center"
                        justify="center"
                      >
                        <Text fontSize={28}>{trophy.emoji}</Text>
                      </YStack>
                    )}
                    <Text
                      fontSize={11}
                      color="$textSecondary"
                      numberOfLines={2}
                      style={{ textAlign: "center" }}
                    >
                      {language === "fr" ? trophy.frTitle : trophy.enTitle}
                    </Text>
                  </YStack>
                ))}
              </ScrollView>
            </YStack>
          )}
        </YStack>
      </ScrollView>
    </YStack>
  );
}
