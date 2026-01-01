import { ChevronLeft, Lock, Star, X } from "@tamagui/lucide-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, H1, H4, Paragraph, Progress, Text, XStack, YStack } from "tamagui";

import { Card } from "@/components/common/Card";
import { Skeleton, SkeletonCard } from "@/components/common/Skeleton";
import { FlameFlicker } from "@/components/village/VillageAnimations";
import {
  getAllBuildings,
  getVillageStats,
  type VillageBuildingWithMeta,
  type VillageStatsType,
} from "@/db/buildings";
import type { MuscleCode, ResourceCode } from "@/db/schema";
import { type BuildingCode, buildingLevelBonuses, buildingLevelThresholds } from "@/db/schema";
import { useHaptics } from "@/hooks/useHaptics";
import { useSettingsStore } from "@/stores/settings";

// Tier background colors
const tierColors: Record<number, string> = {
  1: "$pastelGreen",
  2: "$pastelBlue",
  3: "$pastelPurple",
  4: "$pastelOrange",
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

// Resource localized names
const resourceNames: Record<ResourceCode, { en: string; fr: string }> = {
  gold: { en: "Gold", fr: "Or" },
  wood: { en: "Wood", fr: "Bois" },
  stone: { en: "Stone", fr: "Pierre" },
  fire: { en: "Fire", fr: "Feu" },
  water: { en: "Water", fr: "Eau" },
  wind: { en: "Wind", fr: "Vent" },
  grain: { en: "Grain", fr: "Grain" },
};

// Muscle to resource mapping for display
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
  champion_arena: { en: "Champion Arena", fr: "Arène des champions" },
};

interface BuildingCardProps {
  building: VillageBuildingWithMeta;
  onPress: () => void;
}

function BuildingCard({ building, onPress }: BuildingCardProps) {
  const { language } = useSettingsStore();
  const { t } = useTranslation();
  const { lightImpact } = useHaptics();

  const name =
    buildingNames[building.buildingType]?.[language === "fr" ? "fr" : "en"] ||
    building.buildingType;

  const isLocked = !building.isUnlocked;
  const tierColor = tierColors[building.tier] || "$bgLight";

  // Calculate progress to next level
  const currentThreshold = buildingLevelThresholds[building.level - 1] || 0;
  const nextThreshold = buildingLevelThresholds[building.level] || buildingLevelThresholds[4];
  const xpInLevel = building.xp - currentThreshold;
  const xpNeeded = nextThreshold - currentThreshold;
  const progress = building.level >= 5 ? 100 : Math.min(100, (xpInLevel / xpNeeded) * 100);

  const handlePress = () => {
    if (!isLocked) {
      lightImpact();
      onPress();
    }
  };

  return (
    <Pressable onPress={handlePress} disabled={isLocked}>
      <Card
        bg={isLocked ? "$bgLight" : (tierColor as "$pastelGreen")}
        opacity={isLocked ? 0.5 : 1}
        width="100%"
        mb="$3"
      >
        <XStack items="center" gap="$3">
          <YStack
            width={56}
            height={56}
            rounded={12}
            bg={isLocked ? "$color" : "$background"}
            items="center"
            justify="center"
            borderWidth={2}
            borderColor="$color"
            opacity={isLocked ? 0.3 : 1}
          >
            {isLocked ? (
              <Lock size={24} color="$background" />
            ) : (
              <Text fontSize={28}>{building.emoji}</Text>
            )}
          </YStack>

          <YStack flex={1} gap="$1">
            <XStack items="center" justify="space-between">
              <Text fontWeight="900" fontSize={16} color="$color">
                {name}
              </Text>
              {!isLocked && (
                <XStack items="center" gap="$1">
                  <Star size={14} color="$primary" fill="$primary" />
                  <Text fontWeight="700" fontSize={14} color="$color">
                    {t("village.level", "Lv.")} {building.level}
                  </Text>
                </XStack>
              )}
            </XStack>

            {!isLocked && (
              <YStack gap="$1">
                <Progress size="$1" value={progress} bg="$background">
                  <Progress.Indicator bg="$primary" animation="bouncy" />
                </Progress>
                <Text fontSize={12} color="$color" opacity={0.6}>
                  {building.level >= 5
                    ? t("village.max_level", "Max Level")
                    : `${building.xp} / ${nextThreshold} XP`}
                </Text>
              </YStack>
            )}

            {isLocked && (
              <Text fontSize={12} color="$color" opacity={0.6}>
                {t("village.locked", "Locked")}
              </Text>
            )}
          </YStack>
        </XStack>
      </Card>
    </Pressable>
  );
}

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
    } catch (e) {
      console.error("Failed to load village data:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
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
    {} as Record<number, VillageBuildingWithMeta[]>,
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
    <YStack flex={1} bg="$background">
      {/* Building Detail Modal */}
      <Modal
        visible={selectedBuilding !== null}
        animationType="fade"
        transparent
        onRequestClose={handleCloseModal}
      >
        <YStack flex={1} bg="rgba(0,0,0,0.6)" items="center" justify="center" p="$4">
          <Card bg="$background" width="100%" maxW={360}>
            <YStack gap="$4">
              {/* Header */}
              <XStack items="center" justify="space-between">
                <Text fontWeight="900" fontSize={20} color="$color">
                  {t("village.building_details")}
                </Text>
                <Pressable onPress={handleCloseModal}>
                  <X size={24} color="$color" />
                </Pressable>
              </XStack>

              {/* Building Info */}
              {selectedBuilding && (
                <YStack gap="$3" items="center">
                  {/* Emoji */}
                  <YStack
                    width={80}
                    height={80}
                    rounded={16}
                    bg={(tierColors[selectedBuilding.tier] || "$bgLight") as "$pastelGreen"}
                    items="center"
                    justify="center"
                    borderWidth={3}
                    borderColor="$color"
                  >
                    <Text fontSize={40}>{selectedBuilding.emoji}</Text>
                  </YStack>

                  {/* Name */}
                  <Text
                    fontWeight="900"
                    fontSize={24}
                    color="$color"
                    style={{ textAlign: "center" }}
                  >
                    {selectedBuildingName}
                  </Text>

                  {/* Level Badge */}
                  <XStack items="center" gap="$2" bg="$primary" px="$3" py="$1" rounded="$4">
                    <Star size={16} color="white" fill="white" />
                    <Text fontWeight="800" color="white" fontSize={16}>
                      {t("village.level")} {selectedBuilding.level}
                    </Text>
                  </XStack>

                  {/* Tier */}
                  <Text fontSize={14} color="$color" opacity={0.7}>
                    {t("village.tier", { tier: selectedBuilding.tier })}
                  </Text>

                  {/* Progress */}
                  {selectedBuilding.level < 5 ? (
                    <YStack width="100%" gap="$2">
                      <Progress
                        size="$2"
                        value={(selectedBuilding.xp / selectedNextThreshold) * 100}
                        bg="$bgLight"
                      >
                        <Progress.Indicator bg="$primary" animation="bouncy" />
                      </Progress>
                      <XStack justify="space-between">
                        <Text fontSize={12} color="$color" opacity={0.7}>
                          {t("village.xp_to_next")}
                        </Text>
                        <Text fontSize={12} fontWeight="700" color="$color">
                          {selectedXpToNext} XP
                        </Text>
                      </XStack>
                    </YStack>
                  ) : (
                    <Text fontSize={14} fontWeight="700" color="$primary">
                      ⭐ {t("village.max_level")} ⭐
                    </Text>
                  )}

                  {/* Upgrade Preview */}
                  {selectedBuilding.level < 5 && selectedBuilding.relatedMuscle && (
                    <YStack
                      width="100%"
                      bg="$pastelYellow"
                      p="$3"
                      rounded="$4"
                      borderWidth={2}
                      borderColor="$color"
                      gap="$2"
                    >
                      <Text fontWeight="800" fontSize={14} color="$color">
                        {t("village.next_level")} →
                      </Text>
                      <Text fontSize={13} color="$color">
                        {t("village.bonus_xp", {
                          percent: buildingLevelBonuses[selectedBuilding.level + 1]?.xpPercent || 0,
                          muscle:
                            muscleNames[selectedBuilding.relatedMuscle]?.[
                              language === "fr" ? "fr" : "en"
                            ],
                        })}
                      </Text>
                      <Text fontSize={13} color="$color">
                        {t("village.bonus_resources", {
                          percent:
                            buildingLevelBonuses[selectedBuilding.level + 1]?.resourcePercent || 0,
                          resource:
                            resourceNames[muscleToResource[selectedBuilding.relatedMuscle]]?.[
                              language === "fr" ? "fr" : "en"
                            ],
                        })}
                      </Text>
                      <Text fontSize={13} color="$color">
                        {t("village.bonus_prestige", {
                          points:
                            buildingLevelBonuses[selectedBuilding.level + 1]?.prestigePoints || 0,
                        })}
                      </Text>
                    </YStack>
                  )}

                  {/* Current Bonus (for max level buildings) */}
                  {selectedBuilding.level === 5 && selectedBuilding.relatedMuscle && (
                    <YStack
                      width="100%"
                      bg="$pastelGreen"
                      p="$3"
                      rounded="$4"
                      borderWidth={2}
                      borderColor="$color"
                      gap="$2"
                    >
                      <Text fontWeight="800" fontSize={14} color="$color">
                        {t("village.current_bonus")}
                      </Text>
                      <Text fontSize={13} color="$color">
                        {t("village.bonus_xp", {
                          percent: buildingLevelBonuses[5]?.xpPercent || 0,
                          muscle:
                            muscleNames[selectedBuilding.relatedMuscle]?.[
                              language === "fr" ? "fr" : "en"
                            ],
                        })}
                      </Text>
                      <Text fontSize={13} color="$color">
                        {t("village.bonus_resources", {
                          percent: buildingLevelBonuses[5]?.resourcePercent || 0,
                          resource:
                            resourceNames[muscleToResource[selectedBuilding.relatedMuscle]]?.[
                              language === "fr" ? "fr" : "en"
                            ],
                        })}
                      </Text>
                    </YStack>
                  )}
                </YStack>
              )}

              {/* Close Button */}
              <Button
                bg="$primary"
                borderWidth={3}
                borderColor="$color"
                rounded="$4"
                onPress={handleCloseModal}
              >
                <Text fontWeight="800" color="white">
                  {t("village.close")}
                </Text>
              </Button>
            </YStack>
          </Card>
        </YStack>
      </Modal>

      {/* Header */}
      <XStack
        pt={insets.top + 8}
        px="$4"
        pb="$3"
        bg="$background"
        items="center"
        gap="$3"
        borderBottomWidth={2}
        borderBottomColor="$color"
      >
        <Pressable
          onPress={() => router.back()}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: "white",
            borderWidth: 2,
            borderColor: "black",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ChevronLeft size={24} color="black" />
        </Pressable>
        <YStack flex={1}>
          <H1 fontSize={24} fontWeight="900" color="$color">
            {t("village.title", "My Village")}
          </H1>
        </YStack>
      </XStack>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: insets.bottom + 24,
        }}
      >
        {/* Stats Summary */}
        <Card bg="$pastelYellow" width="100%" mb="$4">
          <XStack items="flex-start" gap="$3">
            {/* Flame decoration */}
            <FlameFlicker size={40} />

            <YStack flex={1} gap="$2">
              <Text fontWeight="900" fontSize={18} color="$color">
                {t("village.stats_title", "Village Progress")}
              </Text>
              <XStack items="center" justify="space-between">
                <Paragraph color="$color" opacity={0.8}>
                  {t("village.buildings_unlocked", "Buildings Unlocked")}
                </Paragraph>
                <Text fontWeight="700" color="$color">
                  {unlockedCount} / {totalCount}
                </Text>
              </XStack>
              {stats && (
                <>
                  <XStack items="center" justify="space-between">
                    <Paragraph color="$color" opacity={0.8}>
                      {t("village.highest_level", "Highest Building Level")}
                    </Paragraph>
                    <Text fontWeight="700" color="$color">
                      {stats.highestBuildingLevel}
                    </Text>
                  </XStack>
                  <XStack items="center" justify="space-between">
                    <Paragraph color="$color" opacity={0.8}>
                      {t("village.prestige", "Prestige Score")}
                    </Paragraph>
                    <Text fontWeight="700" color="$color">
                      {stats.prestigeScore}
                    </Text>
                  </XStack>
                </>
              )}
            </YStack>
          </XStack>
        </Card>

        {/* Buildings by Tier */}
        {[1, 2, 3, 4].map((tier) => {
          const tierBuildings = buildingsByTier[tier] || [];
          if (tierBuildings.length === 0) return null;

          const label = tierLabels[tier]?.[language === "fr" ? "fr" : "en"] || `Tier ${tier}`;

          return (
            <YStack key={tier} mb="$4">
              <H4 fontWeight="900" color="$color" mb="$2">
                {label}
              </H4>
              {tierBuildings.map((b) => (
                <BuildingCard
                  key={b.buildingType}
                  building={b}
                  onPress={() => setSelectedBuilding(b)}
                />
              ))}
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
