import { ArrowLeft } from "@tamagui/lucide-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, XStack, YStack } from "tamagui";

import { AppIconButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { FlameFlicker } from "@/components/common/FlameFlicker";
import { Skeleton, SkeletonCard } from "@/components/common/Skeleton";
import { getAdventureAsset, getSportSpriteAsset, getVillageTierAsset } from "@/constants/assetMap";
import { MUSCLE_LABELS } from "@/db/muscles";
import { getVillageScene, TIER_NAMES, type VillageScene as VillageSceneData } from "@/db/village";
import { useSettingsStore } from "@/stores/settings";

export function VillageScene() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language } = useSettingsStore();

  const [scene, setScene] = useState<VillageSceneData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getVillageScene()
      .then(setScene)
      .catch(() => {
        // Error already handled by null state below
      })
      .finally(() => setIsLoading(false));
  }, []);

  const tierName = scene ? TIER_NAMES[scene.tier][language === "fr" ? "fr" : "en"] : "";

  return (
    <YStack flex={1} bg="$background">
      <XStack
        pt={insets.top + 8}
        px="$4"
        pb="$3"
        bg="$background"
        items="center"
        gap="$3"
        borderBottomWidth={1}
        borderBottomColor="$borderStrong"
      >
        <AppIconButton
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t("quests.go_back", "Go back")}
        >
          <ArrowLeft size={24} color="$text" strokeWidth={2.5} />
        </AppIconButton>
        <Text fontSize={24} fontWeight="700" color="$text">
          {t("village.title", "My Village")}
        </Text>
      </XStack>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: insets.bottom + 24,
        }}
      >
        {isLoading || !scene ? (
          <SkeletonCard>
            <YStack gap="$3" items="center">
              <Skeleton width={96} height={96} radius={48} />
              <Skeleton height={20} width="50%" />
            </YStack>
          </SkeletonCard>
        ) : (
          <YStack gap="$4">
            {/* The scene: tier illustration + sport overlay + flame, no buildings to manage */}
            <Card bg="$surface2" width="100%" items="center" gap="$3" p="$0" overflow="hidden">
              <YStack width="100%" aspectRatio={4 / 3} position="relative">
                <Image
                  source={getVillageTierAsset(scene.tier)}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                  transition={200}
                />
                {!!scene.dominantSport && (
                  <YStack
                    position="absolute"
                    b="$3"
                    r="$3"
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
              </YStack>

              <YStack items="center" gap="$3" px="$4" pb="$5" pt="$3">
                <Text fontWeight="700" fontSize={22} color="$text">
                  {tierName}
                </Text>
                <Text fontSize={13} color="$textSecondary">
                  {t("village.level_line", {
                    level: scene.level,
                    defaultValue: `Level ${scene.level}`,
                  })}
                </Text>

                {scene.flame > 0 && (
                  <XStack items="center" gap="$2">
                    <FlameFlicker size={28} />
                    <Text fontSize={14} color="$text">
                      {t(`village.flame_${scene.flame}`, "")}
                    </Text>
                  </XStack>
                )}

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
            </Card>

            {/* Buildings: derived from training, nothing to unlock by hand */}
            <YStack gap="$2">
              <Text fontWeight="700" fontSize={16} color="$text">
                {t("village.buildings_title", "Buildings")}
              </Text>
              <XStack flexWrap="wrap" gap="$2">
                {scene.buildings.map((building) => {
                  const locked = building.level === 0;
                  const name = language === "fr" ? building.frName : building.enName;
                  return (
                    <Card
                      key={building.code}
                      bg="$surface"
                      width="48%"
                      p="$3"
                      gap="$1"
                      opacity={locked ? 0.45 : 1}
                    >
                      <XStack items="center" gap="$2">
                        <Text fontSize={24}>{locked ? "🔒" : building.emoji}</Text>
                        <Text fontWeight="700" fontSize={13} color="$text" flex={1}>
                          {name}
                        </Text>
                      </XStack>
                      <Text fontSize={11} color="$textSecondary">
                        {locked
                          ? building.unlockCondition
                          : `${t("village.level", { defaultValue: "Lv." })} ${building.level}`}
                      </Text>
                    </Card>
                  );
                })}
              </XStack>
            </YStack>

            {/* Trophy shelf: achievements + defeated bosses, same rack */}
            {scene.trophies.length > 0 && (
              <YStack gap="$2">
                <Text fontWeight="700" fontSize={16} color="$text">
                  {t("village.trophies_title", "Trophies")}
                </Text>
                <XStack flexWrap="wrap" gap="$2">
                  {scene.trophies.map((trophy) => {
                    const title = language === "fr" ? trophy.frTitle : trophy.enTitle;
                    return (
                      <Card
                        key={trophy.key}
                        bg="$surface"
                        width="48%"
                        p="$3"
                        gap="$2"
                        items="center"
                      >
                        {trophy.imagePath ? (
                          <YStack
                            width={44}
                            height={44}
                            rounded={22}
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
                          <Text fontSize={32}>{trophy.emoji}</Text>
                        )}
                        <Text
                          fontSize={12}
                          fontWeight="700"
                          color="$text"
                          style={{ textAlign: "center" }}
                        >
                          {title}
                        </Text>
                      </Card>
                    );
                  })}
                </XStack>
              </YStack>
            )}
          </YStack>
        )}
      </ScrollView>
    </YStack>
  );
}
