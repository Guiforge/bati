import { getResourceInventory, type ResourceAmount } from "@/db/resources";
import type { ResourceCode } from "@/db/schema";
import { useGameIcons } from "@/hooks/useGameIcon";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable } from "react-native";
import { Text, XStack, YStack } from "tamagui";

const RESOURCE_ORDER: ResourceCode[] = ["gold", "wood", "stone", "fire", "water", "wind", "grain"];

const RESOURCE_COLORS: Record<string, string> = {
    gold: "#FFD700",
    wood: "#8B4513",
    stone: "#808080",
    fire: "#FF6B35",
    water: "#4ECDC4",
    wind: "#C9B1FF",
    grain: "#DAA520",
    mana: "#9B59B6",
    leaf: "#2ECC71",
    boss_token: "#E74C3C",
};

// Map resource codes to icon names
const RESOURCE_ICONS = {
    gold: "gold",
    wood: "wood",
    stone: "stone",
    fire: "fire",
    water: "water",
    wind: "wind",
    grain: "grain",
} as const;

export function ResourcesOverview() {
    const router = useRouter();

    const [resources, setResources] = useState<ResourceAmount[]>([]);
    const icons = useGameIcons(["gold", "wood", "stone", "fire", "water", "wind", "grain", "chest"]);

    useEffect(() => {
        getResourceInventory().then(setResources);
    }, []);

    const getAmount = (code: ResourceCode) => {
        return resources.find((r) => r.resource === code)?.amount ?? 0;
    };

    const formatAmount = (amount: number) => {
        if (amount >= 1000) return `${(amount / 1000).toFixed(1)}k`;
        return amount.toString();
    };

    return (
        <Pressable onPress={() => router.push("/treasury" as "/dev")}>
            <XStack
                bg="$bgLight"
                borderWidth={2}
                borderColor="$color"
                rounded="$4"
                mx="$4"
                px="$3"
                py="$2"
                items="center"
                justify="space-between"
            >
                {/* Resources */}
                <XStack gap="$3" flex={1} justify="space-around">
                    {RESOURCE_ORDER.map((code) => {
                        const iconName = RESOURCE_ICONS[code as keyof typeof RESOURCE_ICONS];
                        return (
                            <YStack key={code} items="center" gap={2}>
                                <Image
                                    source={icons[iconName]}
                                    style={{
                                        width: 18,
                                        height: 18,
                                        tintColor: RESOURCE_COLORS[code],
                                    }}
                                    contentFit="contain"
                                />
                                <Text fontSize={11} fontWeight="bold" color="$color">
                                    {formatAmount(getAmount(code))}
                                </Text>
                            </YStack>
                        );
                    })}
                </XStack>

                {/* Chevron / Treasury hint */}
                <YStack pl="$2" items="center">
                    <Image
                        source={icons.chest}
                        style={{ width: 20, height: 20, opacity: 0.5 }}
                        contentFit="contain"
                    />
                </YStack>
            </XStack>
        </Pressable>
    );
}
