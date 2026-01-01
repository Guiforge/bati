import { ChevronLeft, Lock, Star } from "@tamagui/lucide-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { H1, H4, Paragraph, Progress, Text, XStack, YStack } from "tamagui";

import { Card } from "@/components/common/Card";

import {
    getAllBuildings,
    getVillageStats,
    type VillageBuildingWithMeta,
    type VillageStatsType,
} from "@/db/buildings";
import { type BuildingCode, buildingLevelThresholds } from "@/db/schema";
import { useSettingsStore } from "@/stores/settings";

// Tier background colors
const tierColors: Record<number, string> = {
    1: "$pastelGreen",
    2: "$pastelBlue",
    3: "$pastelPurple",
    4: "$pastelOrange",
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

function BuildingCard({ building }: { building: VillageBuildingWithMeta }) {
    const { language } = useSettingsStore();
    const { t } = useTranslation();

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

    return (
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
    );
}

export function VillageScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [buildings, setBuildings] = useState<VillageBuildingWithMeta[]>([]);
    const [stats, setStats] = useState<VillageStatsType | null>(null);
    const [isLoading, setIsLoading] = useState(true);

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

    const { language } = useSettingsStore();

    const unlockedCount = buildings.filter((b) => b.isUnlocked).length;
    const totalCount = buildings.length;

    return (
        <YStack flex={1} bg="$background">
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
                    <YStack gap="$2">
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
                                <BuildingCard key={b.buildingType} building={b} />
                            ))}
                        </YStack>
                    );
                })}

                {isLoading && (
                    <YStack items="center" py="$6">
                        <Text color="$color" opacity={0.6}>
                            {t("common.loading", "Loading...")}
                        </Text>
                    </YStack>
                )}
            </ScrollView>
        </YStack>
    );
}
