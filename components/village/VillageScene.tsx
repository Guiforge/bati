import { ArrowLeft, Crown } from "@tamagui/lucide-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, XStack, YStack } from "tamagui";

import { AppIconButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { Skeleton, SkeletonCard } from "@/components/common/Skeleton";
import { FlameFlicker } from "@/components/village/VillageAnimations";
import { MUSCLE_LABELS } from "@/db/muscles";
import { getVillageScene, type VillageScene as VillageSceneData } from "@/db/village";
import { useGameIcons } from "@/hooks/useGameIcon";
import { useSettingsStore } from "@/stores/settings";

const TIER_NAMES: Record<1 | 2 | 3 | 4 | 5, { en: string; fr: string }> = {
  1: { en: "Hamlet", fr: "Hameau" },
  2: { en: "Village", fr: "Village" },
  3: { en: "Town", fr: "Bourg" },
  4: { en: "City", fr: "Cité" },
  5: { en: "Flourishing City", fr: "Cité florissante" },
};

export function VillageScene() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language } = useSettingsStore();
  const icons = useGameIcons(["castle"]);

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
            {/* The scene: tier + flame overlay, no buildings to manage */}
            <Card bg="$surface2" width="100%" items="center" gap="$3" py="$6">
              <YStack
                width={120}
                height={120}
                rounded={60}
                bg="$surface"
                borderWidth={1}
                borderColor="$borderStrong"
                items="center"
                justify="center"
              >
                <Image
                  source={icons.castle}
                  style={{ width: 64, height: 64 }}
                  contentFit="contain"
                />
              </YStack>
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

              {scene.dominantSport && (
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
            </Card>

            {/* Boss banners */}
            {scene.bossBanners.length > 0 && (
              <YStack gap="$2">
                <Text fontWeight="700" fontSize={16} color="$text">
                  {t("village.banners_title", "Banners")}
                </Text>
                {scene.bossBanners.map((banner) => {
                  const title = language === "fr" ? banner.frTitle : banner.enTitle;
                  return (
                    <Card key={banner.adventureId} bg="$surface" width="100%">
                      <XStack items="center" gap="$3">
                        <Crown size={22} color="$primary" />
                        <Text fontWeight="700" color="$text">
                          {title}
                        </Text>
                      </XStack>
                    </Card>
                  );
                })}
              </YStack>
            )}
          </YStack>
        )}
      </ScrollView>
    </YStack>
  );
}
