import { ChevronLeft, Star, X } from "@tamagui/lucide-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, H1, H4, Paragraph, Progress, Text, XStack, YStack } from "tamagui";

import { Skeleton, SkeletonCard } from "@/src/components/common/Skeleton";
import { FlameFlicker } from "@/src/components/village/VillageAnimations";
import {
  getVillageBuildingAsset,
  type VillageBuildingVariant,
} from "@/src/constants/villageAssets";
import {
  getAllBuildings,
  getVillageStats,
  type VillageBuildingWithMeta,
  type VillageStatsType,
} from "@/src/db/buildings";
import type { MuscleCode, ResourceCode } from "@/src/db/schema";
import { type BuildingCode, buildingLevelBonuses, buildingLevelThresholds } from "@/src/db/schema";
import { useHaptics } from "@/src/hooks/useHaptics";
import { useSettingsStore } from "@/src/stores/settings";

// Tier background colors - Dark fantasy with glow
const tierColors: Record<number, string> = {
  1: "rgba(34, 197, 94, 0.15)", // Green glow
  2: "rgba(13, 51, 242, 0.15)", // Blue glow
  3: "rgba(139, 92, 246, 0.15)", // Purple glow
  4: "rgba(255, 215, 0, 0.15)", // Gold glow
};

const tierBorderColors: Record<number, string> = {
  1: "rgba(34, 197, 94, 0.4)",
  2: "rgba(13, 51, 242, 0.4)",
  3: "rgba(139, 92, 246, 0.4)",
  4: "rgba(255, 215, 0, 0.4)",
};

// Muscle localized names
const muscleNames: Record<MuscleCode, { en: string; fr: string }> = {
  arms: { en: "Arms", fr: "Bras" },
  back: { en: "Back", fr: "Dos" },
  chest: { en: "Chest", fr: "Poitrine" },
  abs: { en: "Abs", fr: "Abdos" },
  shoulder: { en: "Shoulders", fr: "Épaules" },
  calf: { en: "Legs", fr: "Jambes" },
};

// Resource localized names (simplified)
const resourceNames: Record<ResourceCode, { en: string; fr: string }> = {
  gold: { en: "Gold", fr: "Or" },
  wood: { en: "Wood", fr: "Bois" },
  stone: { en: "Stone", fr: "Pierre" },
  fire: { en: "Fire", fr: "Feu" },
  water: { en: "Water", fr: "Eau" },
  wind: { en: "Wind", fr: "Vent" },
  grain: { en: "Grain", fr: "Grain" },
  mana: { en: "Mana", fr: "Mana" },
  leaf: { en: "Leaf", fr: "Feuille" },
  boss_token: { en: "Boss Token", fr: "Jeton de Boss" },
};

// Muscles generate element resources
const muscleToResource: Record<MuscleCode, ResourceCode> = {
  arms: "wood",
  back: "stone",
  chest: "fire",
  abs: "water",
  shoulder: "wind",
  calf: "grain",
};

// Building localized names
const buildingNames: Record<BuildingCode, { en: string; fr: string }> = {
  campfire: { en: "Campfire", fr: "Feu de camp" },
  tent: { en: "Tent", fr: "Tente" },
  training_dummy: { en: "Training Dummy", fr: "Mannequin d'entraînement" },
  archery_range: { en: "Archery Range", fr: "Champ de tir" },
  quarry: { en: "Quarry", fr: "Carrière" },
  forge: { en: "Forge", fr: "Forge" },
  well: { en: "Well", fr: "Puits" },
  windmill: { en: "Windmill", fr: "Moulin" },
  farm: { en: "Farm", fr: "Ferme" },
  watchtower: { en: "Watchtower", fr: "Tour de guet" },
  castle_wall: { en: "Castle Wall", fr: "Muraille" },
  armory: { en: "Armory", fr: "Armurerie" },
  fountain: { en: "Fountain", fr: "Fontaine" },
  observatory: { en: "Observatory", fr: "Observatoire" },
  barn: { en: "Barn", fr: "Grange" },
  dragon_lair: { en: "Dragon Lair", fr: "Antre du dragon" },
  heroes_hall: { en: "Hero's Hall", fr: "Salle des héros" },
  wizard_tower: { en: "Wizard Tower", fr: "Tour du mage" },
  druid_grove: { en: "Druid Grove", fr: "Bosquet druidique" },
  champion_arena: { en: "Champion Arena", fr: "Arène des champions" },
};

interface BuildingCardProps {
  building: VillageBuildingWithMeta;
  onPress: () => void;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Building card with various states and progress display
function BuildingCard({ building, onPress }: BuildingCardProps) {
  const { language } = useSettingsStore();
  const { t } = useTranslation();
  const { impact } = useHaptics();

  const name =
    buildingNames[building.buildingType]?.[language === "fr" ? "fr" : "en"] ||
    building.buildingType;

  const isLocked = !building.isUnlocked;

  // Calculate progress to next level
  const currentThreshold = buildingLevelThresholds[building.level - 1] || 0;
  const nextThreshold = buildingLevelThresholds[building.level] || buildingLevelThresholds[4];
  const xpInLevel = building.xp - currentThreshold;
  const xpNeeded = nextThreshold - currentThreshold;
  const progress = building.level >= 5 ? 100 : Math.min(100, (xpInLevel / xpNeeded) * 100);

  const handlePress = () => {
    if (!isLocked) {
      impact();
      onPress();
    }
  };

  return (
    <Pressable onPress={handlePress} disabled={isLocked}>
      <YStack
        bg="$glassBg"
        borderWidth={1}
        borderRadius="$4"
        overflow="hidden"
        opacity={isLocked ? 0.6 : 1}
        pressStyle={!isLocked ? { opacity: 0.8, scale: 0.98 } : {}}
        style={{
          backgroundColor: isLocked ? "rgba(255,255,255,0.05)" : tierColors[building.tier],
          borderColor: isLocked ? "rgba(255,255,255,0.1)" : tierBorderColors[building.tier],
        }}
      >
        {/* Large Image on Top */}
        <YStack
          width="100%"
          height={140}
          bg={isLocked ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.2)"}
          items="center"
          justify="center"
          position="relative"
        >
          <Image
            source={getVillageBuildingAsset(
              building.buildingType,
              isLocked ? "locked" : (`lvl_${building.level}` as VillageBuildingVariant)
            )}
            style={{ width: "100%", height: "100%", opacity: isLocked ? 0.4 : 1 }}
            contentFit="cover"
          />

          {/* Level Badge - Top Right */}
          {!isLocked && (
            <XStack
              position="absolute"
              top={8}
              right={8}
              bg="$primary"
              px="$2"
              py="$1"
              borderRadius="$3"
              items="center"
              gap="$1"
            >
              <Star size={12} color="white" fill="white" />
              <Text fontWeight="800" fontSize={11} color="white">
                {building.level}
              </Text>
            </XStack>
          )}

          {/* Locked Overlay */}
          {isLocked && (
            <YStack
              position="absolute"
              items="center"
              justify="center"
              bg="rgba(0,0,0,0.7)"
              width="100%"
              height="100%"
            >
              <Text fontSize={32}>🔒</Text>
            </YStack>
          )}
        </YStack>

        {/* Bottom Info Section */}
        <YStack p="$3" gap="$2">
          <Text fontWeight="900" fontSize={15} color="$text" numberOfLines={1}>
            {name}
          </Text>

          {!isLocked && building.level < 5 && (
            <YStack gap="$1.5">
              <Progress size="$1" value={progress} bg="rgba(255,255,255,0.1)">
                <Progress.Indicator bg="$primary" animation="bouncy" />
              </Progress>
              <Text fontSize={11} color="$textSecondary" opacity={0.8}>
                {xpInLevel} / {xpNeeded} XP
              </Text>
            </YStack>
          )}

          {!isLocked && building.level >= 5 && (
            <Text fontSize={11} fontWeight="700" color="$primary">
              ⭐ {t("village.max_level", "MAX")}
            </Text>
          )}

          {isLocked && (
            <Text fontSize={11} color="$textSecondary" opacity={0.6}>
              🔒 {t("village.locked", "Verrouillé")}
            </Text>
          )}
        </YStack>
      </YStack>
    </Pressable>
  );
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Village management screen with multiple building states
export function VillageScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language } = useSettingsStore();

  const [buildings, setBuildings] = useState<VillageBuildingWithMeta[]>([]);
  const [stats, setStats] = useState<VillageStatsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBuilding, setSelectedBuilding] = useState<VillageBuildingWithMeta | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [buildingsData, statsData] = await Promise.all([getAllBuildings(), getVillageStats()]);
      setBuildings(buildingsData);
      setStats(statsData);
    } catch (_e) {
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData().catch(() => {
      // Error already handled
    });
  }, [loadData]);

  const handleCloseModal = () => {
    setSelectedBuilding(null);
  };

  // Group buildings by tier
  const buildingsByTier = buildings.reduce(
    (acc, b) => {
      const tier = b.tier;
      if (!acc[tier]) acc[tier] = [];
      acc[tier].push(b);
      return acc;
    },
    {} as Record<number, VillageBuildingWithMeta[]>
  );

  const tierLabels: Record<number, { en: string; fr: string }> = {
    1: { en: "Starter Buildings", fr: "Bâtiments de départ" },
    2: { en: "Basic Buildings", fr: "Bâtiments de base" },
    3: { en: "Advanced Buildings", fr: "Bâtiments avancés" },
    4: { en: "Legendary Buildings", fr: "Bâtiments légendaires" },
  };

  const unlockedCount = buildings.filter((b) => b.isUnlocked).length;
  const totalCount = buildings.length;

  // Get selected building name for modal
  const selectedBuildingName = selectedBuilding
    ? buildingNames[selectedBuilding.buildingType]?.[language === "fr" ? "fr" : "en"] ||
      selectedBuilding.buildingType
    : "";

  // Calculate selected building progress
  const selectedNextThreshold = selectedBuilding
    ? buildingLevelThresholds[selectedBuilding.level] || buildingLevelThresholds[4]
    : 0;
  const selectedXpToNext = selectedBuilding
    ? Math.max(0, selectedNextThreshold - selectedBuilding.xp)
    : 0;

  return (
    <YStack flex={1} bg="$bgDark" pt={insets.top}>
      {/* Building Detail Modal - Modern Full Screen */}
      <Modal
        visible={selectedBuilding !== null}
        animationType="slide"
        transparent
        onRequestClose={handleCloseModal}
      >
        <YStack flex={1} bg="rgba(0,0,0,0.95)">
          {selectedBuilding && (
            <>
              {/* Hero Image at Top */}
              <YStack
                height={280}
                position="relative"
                style={{
                  backgroundColor: tierColors[selectedBuilding.tier] || tierColors[1],
                }}
              >
                <Image
                  source={getVillageBuildingAsset(
                    selectedBuilding.buildingType,
                    `lvl_${selectedBuilding.level}` as VillageBuildingVariant
                  )}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                />

                {/* Close Button */}
                <Pressable
                  onPress={handleCloseModal}
                  style={{
                    position: "absolute",
                    top: insets.top + 12,
                    right: 16,
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: "rgba(0,0,0,0.6)",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <X size={24} color="white" />
                </Pressable>

                {/* Level Badge - Bottom Right */}
                <XStack
                  position="absolute"
                  bottom={16}
                  right={16}
                  bg="$primary"
                  px="$3"
                  py="$2"
                  borderRadius="$4"
                  items="center"
                  gap="$2"
                  shadowColor="$primary"
                  shadowOpacity={0.5}
                  shadowRadius={12}
                >
                  <Star size={18} color="white" fill="white" />
                  <Text fontWeight="900" fontSize={18} color="white">
                    {t("village.level")} {selectedBuilding.level}
                  </Text>
                </XStack>
              </YStack>

              {/* Scrollable Content */}
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  paddingHorizontal: 20,
                  paddingTop: 24,
                  paddingBottom: insets.bottom + 80,
                }}
              >
                <YStack gap="$4">
                  {/* Building Name & Tier */}
                  <YStack gap="$2">
                    <Text
                      fontWeight="900"
                      fontSize={28}
                      color="$text"
                      style={{ textAlign: "center" }}
                    >
                      {selectedBuildingName}
                    </Text>
                    <Text
                      fontSize={13}
                      color="$textSecondary"
                      opacity={0.7}
                      style={{ textAlign: "center" }}
                    >
                      {t("village.tier", { tier: selectedBuilding.tier })}
                    </Text>
                  </YStack>

                  {/* Progress Section */}
                  {selectedBuilding.level < 5 ? (
                    <YStack
                      bg="$glassBg"
                      borderWidth={1}
                      borderColor="$borderStrong"
                      p="$4"
                      borderRadius="$4"
                      gap="$3"
                    >
                      <Text fontWeight="800" fontSize={15} color="$text">
                        {t("village.xp_to_next", "Progression")}
                      </Text>
                      <Progress
                        size="$3"
                        value={(selectedBuilding.xp / selectedNextThreshold) * 100}
                        bg="rgba(255,255,255,0.1)"
                      >
                        <Progress.Indicator bg="$primary" animation="bouncy" />
                      </Progress>
                      <XStack justify="space-between">
                        <Text fontSize={13} color="$textSecondary">
                          {selectedBuilding.xp} XP
                        </Text>
                        <Text fontSize={13} fontWeight="700" color="$text">
                          {selectedXpToNext} {t("village.xp_to_next", "restant")}
                        </Text>
                      </XStack>
                    </YStack>
                  ) : (
                    <YStack
                      bg="rgba(255, 215, 0, 0.15)"
                      borderWidth={1}
                      borderColor="rgba(255, 215, 0, 0.4)"
                      p="$4"
                      borderRadius="$4"
                      items="center"
                    >
                      <Text fontSize={16} fontWeight="900" color="$primary">
                        ⭐ {t("village.max_level", "NIVEAU MAXIMUM")} ⭐
                      </Text>
                    </YStack>
                  )}

                  {/* Upgrade Preview */}
                  {selectedBuilding.level < 5 && selectedBuilding.relatedMuscle && (
                    <YStack
                      bg="rgba(13, 51, 242, 0.15)"
                      borderWidth={1}
                      borderColor="rgba(13, 51, 242, 0.4)"
                      p="$4"
                      borderRadius="$4"
                      gap="$3"
                    >
                      <Text fontWeight="900" fontSize={15} color="$text">
                        🎯 {t("village.next_level", "Prochain niveau")}
                      </Text>
                      <YStack gap="$2">
                        <Text fontSize={14} color="$text">
                          💪 +{buildingLevelBonuses[selectedBuilding.level + 1]?.xpPercent || 0}% XP
                          (
                          {
                            muscleNames[selectedBuilding.relatedMuscle]?.[
                              language === "fr" ? "fr" : "en"
                            ]
                          }
                          )
                        </Text>
                        <Text fontSize={14} color="$text">
                          📦 +
                          {buildingLevelBonuses[selectedBuilding.level + 1]?.resourcePercent || 0}%{" "}
                          {
                            resourceNames[muscleToResource[selectedBuilding.relatedMuscle]]?.[
                              language === "fr" ? "fr" : "en"
                            ]
                          }
                        </Text>
                        <Text fontSize={14} color="$text">
                          ⭐ +
                          {buildingLevelBonuses[selectedBuilding.level + 1]?.prestigePoints || 0}{" "}
                          {t("village.prestige", "Prestige")}
                        </Text>
                      </YStack>
                    </YStack>
                  )}

                  {/* Current Bonus (for max level buildings) */}
                  {selectedBuilding.level === 5 && selectedBuilding.relatedMuscle && (
                    <YStack
                      bg="rgba(34, 197, 94, 0.15)"
                      borderWidth={1}
                      borderColor="rgba(34, 197, 94, 0.4)"
                      p="$4"
                      borderRadius="$4"
                      gap="$3"
                    >
                      <Text fontWeight="900" fontSize={15} color="$text">
                        🏆 {t("village.current_bonus", "Bonus actuels")}
                      </Text>
                      <YStack gap="$2">
                        <Text fontSize={14} color="$text">
                          💪 +{buildingLevelBonuses[5]?.xpPercent || 0}% XP (
                          {
                            muscleNames[selectedBuilding.relatedMuscle]?.[
                              language === "fr" ? "fr" : "en"
                            ]
                          }
                          )
                        </Text>
                        <Text fontSize={14} color="$text">
                          📦 +{buildingLevelBonuses[5]?.resourcePercent || 0}%{" "}
                          {
                            resourceNames[muscleToResource[selectedBuilding.relatedMuscle]]?.[
                              language === "fr" ? "fr" : "en"
                            ]
                          }
                        </Text>
                      </YStack>
                    </YStack>
                  )}
                </YStack>
              </ScrollView>

              {/* Bottom Close Button */}
              <YStack
                position="absolute"
                bottom={0}
                left={0}
                right={0}
                p="$4"
                pb={insets.bottom + 16}
                bg="rgba(11, 15, 25, 0.95)"
                borderTopWidth={1}
                borderTopColor="$borderStrong"
              >
                <Button
                  bg="$primary"
                  borderRadius="$4"
                  onPress={handleCloseModal}
                  pressStyle={{ opacity: 0.8 }}
                  size="$5"
                >
                  <Text fontWeight="900" color="white" fontSize={16}>
                    {t("village.close", "Fermer")}
                  </Text>
                </Button>
              </YStack>
            </>
          )}
        </YStack>
      </Modal>

      {/* Header */}
      <XStack px="$4" pb="$3" items="center" gap="$3">
        <Pressable onPress={() => router.back()}>
          <YStack
            width={44}
            height={44}
            borderRadius={22}
            bg="$glassBg"
            borderWidth={1}
            borderColor="$borderStrong"
            items="center"
            justify="center"
          >
            <ChevronLeft size={24} color="$text" />
          </YStack>
        </Pressable>
        <YStack flex={1}>
          <H1 fontSize={24} fontWeight="900" color="$text">
            {t("village.title", "My Village")}
          </H1>
        </YStack>
      </XStack>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: insets.bottom + 100,
        }}
      >
        {/* Stats Summary */}
        <YStack
          bg="$glassBg"
          borderWidth={1}
          borderColor="$borderStrong"
          borderRadius="$4"
          p="$4"
          mb="$4"
        >
          <XStack items="flex-start" gap="$3">
            {/* Flame decoration */}
            <FlameFlicker size={40} />

            <YStack flex={1} gap="$2">
              <Text fontWeight="900" fontSize={18} color="$text">
                {t("village.stats_title", "Village Progress")}
              </Text>
              <XStack items="center" justify="space-between">
                <Paragraph color="$textSecondary" opacity={0.8}>
                  {t("village.buildings_unlocked", "Buildings Unlocked")}
                </Paragraph>
                <Text fontWeight="700" color="$text">
                  {unlockedCount} / {totalCount}
                </Text>
              </XStack>
              {stats && (
                <>
                  <XStack items="center" justify="space-between">
                    <Paragraph color="$textSecondary" opacity={0.8}>
                      {t("village.highest_level", "Highest Building Level")}
                    </Paragraph>
                    <Text fontWeight="700" color="$text">
                      {stats.highestBuildingLevel}
                    </Text>
                  </XStack>
                  <XStack items="center" justify="space-between">
                    <Paragraph color="$textSecondary" opacity={0.8}>
                      {t("village.prestige", "Prestige Score")}
                    </Paragraph>
                    <Text fontWeight="700" color="$text">
                      {stats.prestigeScore}
                    </Text>
                  </XStack>
                </>
              )}
            </YStack>
          </XStack>
        </YStack>

        {/* Buildings by Tier - Grid Layout */}
        {[1, 2, 3, 4].map((tier) => {
          const tierBuildings = buildingsByTier[tier] || [];
          if (tierBuildings.length === 0) return null;

          const label = tierLabels[tier]?.[language === "fr" ? "fr" : "en"] || `Tier ${tier}`;

          return (
            <YStack key={tier} mb="$5">
              <H4 fontWeight="900" color="$text" mb="$3">
                {label}
              </H4>
              {/* Grid: 2 columns */}
              <XStack flexWrap="wrap" gap="$3" justifyContent="space-between">
                {tierBuildings.map((b) => (
                  <YStack key={b.buildingType} width="48%">
                    <BuildingCard building={b} onPress={() => setSelectedBuilding(b)} />
                  </YStack>
                ))}
              </XStack>
            </YStack>
          );
        })}

        {isLoading && (
          <YStack gap="$4" py="$4">
            <SkeletonCard>
              <XStack gap="$3" items="center">
                <Skeleton width={48} height={48} radius={8} />
                <YStack flex={1} gap="$2">
                  <Skeleton height={18} width="60%" />
                  <Skeleton height={10} width="100%" />
                </YStack>
              </XStack>
            </SkeletonCard>
            <SkeletonCard>
              <XStack gap="$3" items="center">
                <Skeleton width={48} height={48} radius={8} />
                <YStack flex={1} gap="$2">
                  <Skeleton height={18} width="50%" />
                  <Skeleton height={10} width="100%" />
                </YStack>
              </XStack>
            </SkeletonCard>
          </YStack>
        )}
      </ScrollView>
    </YStack>
  );
}
