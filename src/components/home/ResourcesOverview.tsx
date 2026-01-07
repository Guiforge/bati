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
    <YStack position="relative" mb="$2">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 0, paddingRight: 20 }}
      >
        <XStack gap="$3" items="center">
          {/* Treasury Action - Distinct minimalist square */}
          <Pressable onPress={() => router.push("/treasury" as "/dev")}>
            <YStack
              bg="$glassBg"
              borderWidth={1}
              borderColor="$borderStrong"
              rounded="$3"
              width={44}
              height={44}
              justify="center"
              items="center"
              pressStyle={{ scale: 0.95, opacity: 0.8 }}
            >
              <GameIcon name="lorc/locked-chest" size={22} tintColor="$primary" />
            </YStack>
          </Pressable>

          {/* Vertical Divider */}
          <YStack width={1} height={24} bg="$borderStrong" opacity={0.3} />

          {/* Resource Pills */}
          {RESOURCE_ORDER.map((code) => {
            const iconName = RESOURCE_ICONS[code];
            const amount = getAmount(code);

            return (
              <XStack
                key={code}
                bg="$glassBg"
                borderColor="$borderStrong"
                borderWidth={1}
                borderRadius={1000}
                pl="$2.5"
                pr="$3.5"
                py="$1.5"
                items="center"
                gap="$2"
              >
                <GameIcon name={iconName} size={14} tintColor={RESOURCE_COLORS[code]} />
                <Text fontSize={12} fontWeight="700" color="$text" opacity={amount > 0 ? 1 : 0.6}>
                  {formatAmount(amount)}
                </Text>
              </XStack>
            );
          })}
        </XStack>
      </ScrollView>
    </YStack>
  );
}
