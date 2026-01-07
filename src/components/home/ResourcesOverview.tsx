import { ChevronRight } from "@tamagui/lucide-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView } from "react-native";
import { Text, XStack, YStack } from "tamagui";
import { getResourceInventory, type ResourceAmount } from "@/src/db/resources";
import type { ResourceCode } from "@/src/db/schema";
import { GameIcon, type GameIconName } from "@/src/hooks/useGameIcon";

const RESOURCE_ORDER: ResourceCode[] = ["gold", "wood", "stone", "fire", "water", "wind", "grain"];

const RESOURCE_COLORS: Record<string, string> = {
  gold: "$gold",
  wood: "$resourceWood",
  stone: "$resourceStone",
  fire: "$resourceFire",
  water: "$resourceWater",
  wind: "$resourceWind",
  grain: "$resourceGrain",
  mana: "$resourceMana",
  leaf: "$resourceLeaf",
  boss_token: "$resourceBossToken",
};

// Map resource codes to icon names
const RESOURCE_ICONS: Record<string, GameIconName> = {
  gold: "lorc/crown-coin",
  wood: "lorc/wood-axe",
  stone: "lorc/stone-block",
  fire: "lorc/campfire",
  water: "lorc/drop",
  wind: "lorc/feather",
  grain: "lorc/wheat",
};

export function ResourcesOverview() {
  const router = useRouter();

  const [resources, setResources] = useState<ResourceAmount[]>([]);

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
    <YStack position="relative">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 4, paddingRight: 40 }}
      >
        <XStack gap="$3">
          {/* Treasury Button (First Item) */}
          <Pressable onPress={() => router.push("/treasury" as "/dev")}>
            <YStack
              bg="$bgLight"
              borderWidth={2}
              borderColor="$color"
              rounded="$4"
              p="$2"
              width={50}
              height={50}
              justify="center"
              items="center"
            >
              <GameIcon name="lorc/locked-chest" size={24} />
            </YStack>
          </Pressable>

          {/* Resource Items */}
          {RESOURCE_ORDER.map((code) => {
            const iconName = RESOURCE_ICONS[code];
            return (
              <YStack
                key={code}
                bg="$bgLight"
                borderWidth={2}
                borderColor="$color"
                rounded="$4"
                px="$3"
                py="$1"
                width={70}
                justify="center"
                items="center"
                gap="$1"
              >
                <GameIcon name={iconName} size={18} tintColor={RESOURCE_COLORS[code]} />
                <Text fontSize={12} fontWeight="bold" color="$color">
                  {formatAmount(getAmount(code))}
                </Text>
              </YStack>
            );
          })}
        </XStack>
      </ScrollView>

      {/* Scroll Hint */}
      <YStack
        position="absolute"
        justify="center"
        pointerEvents="none"
        pr="$2"
        style={{ right: 0, top: 0, bottom: 0 }}
      >
        <ChevronRight size={20} color="$color" opacity={0.5} />
      </YStack>
    </YStack>
  );
}
