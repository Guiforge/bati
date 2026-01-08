import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView } from "react-native";
import { Text, XStack, YStack } from "tamagui";
import { getResourceInventory, type ResourceAmount } from "@/src/db/resources";
import type { ResourceCode } from "@/src/db/schema";
import { GameIcon, type GameIconName } from "@/src/hooks/useGameIcon";

const RESOURCE_ORDER: ResourceCode[] = ["gold", "wood", "stone", "fire", "water", "wind", "grain"];

const RESOURCE_CONFIG: Record<
  string,
  {
    icon: GameIconName;
    color:
      | "$resourceGold"
      | "$resourceWood"
      | "$resourceStone"
      | "$resourceFire"
      | "$resourceWater"
      | "$resourceWind"
      | "$resourceGrain";
  }
> = {
  gold: { icon: "lorc/crown-coin", color: "$resourceGold" },
  wood: { icon: "lorc/wood-axe", color: "$resourceWood" },
  stone: { icon: "lorc/stone-block", color: "$resourceStone" },
  fire: { icon: "lorc/campfire", color: "$resourceFire" },
  water: { icon: "lorc/drop", color: "$resourceWater" },
  wind: { icon: "lorc/feather", color: "$resourceWind" },
  grain: { icon: "lorc/wheat", color: "$resourceGrain" },
};

export function StylizedResourcesBar() {
  const router = useRouter();
  const [resources, setResources] = useState<ResourceAmount[]>([]);

  useEffect(() => {
    getResourceInventory().then(setResources);
  }, []);

  const getAmount = (code: ResourceCode) => {
    return resources.find((r) => r.resource === code)?.amount ?? 0;
  };

  const formatAmount = (amount: number) => {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)}k`;
    return amount.toString();
  };

  return (
    <YStack gap="$3">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 0, gap: 10 }}
      >
        {/* Treasury Button - Featured */}
        <Pressable onPress={() => router.push("/treasury" as "/dev")}>
          <YStack
            position="relative"
            overflow="hidden"
            bg="rgba(13, 51, 242, 0.1)"
            borderWidth={1}
            borderColor="$primary"
            borderRadius="$3"
            width={52}
            height={52}
            justify="center"
            items="center"
            pressStyle={{ scale: 0.95, opacity: 0.8 }}
            // Glow effect
            shadowColor="$primaryGlow"
            shadowRadius={10}
            shadowOpacity={0.4}
          >
            {/* Inner glow */}
            <YStack
              position="absolute"
              width={30}
              height={30}
              borderRadius={1000}
              bg="$primary"
              opacity={0.15}
            />
            <GameIcon name="lorc/locked-chest" size={24} tintColor="$primary" />
          </YStack>
        </Pressable>

        {/* Decorative Divider */}
        <YStack justify="center">
          <YStack width={1} height={32} overflow="hidden">
            <LinearGradient
              colors={["transparent", "rgba(139, 92, 246, 0.5)", "transparent"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={{ flex: 1 }}
            />
          </YStack>
        </YStack>

        {/* Resource Items */}
        {RESOURCE_ORDER.map((code) => {
          const config = RESOURCE_CONFIG[code];
          if (!config) return null;
          const amount = getAmount(code);

          return (
            <ResourceItem
              key={code}
              icon={config.icon}
              color={config.color}
              amount={formatAmount(amount)}
              hasAmount={amount > 0}
            />
          );
        })}
      </ScrollView>
    </YStack>
  );
}

function ResourceItem({
  icon,
  color,
  amount,
  hasAmount,
}: {
  icon: GameIconName;
  color:
    | "$resourceGold"
    | "$resourceWood"
    | "$resourceStone"
    | "$resourceFire"
    | "$resourceWater"
    | "$resourceWind"
    | "$resourceGrain";
  amount: string;
  hasAmount: boolean;
}) {
  return (
    <YStack position="relative" overflow="hidden">
      <XStack
        bg="$glassBg"
        borderWidth={1}
        borderColor="$borderStrong"
        borderRadius={1000}
        pl="$2"
        pr="$3"
        py="$2"
        gap="$2"
        items="center"
        opacity={hasAmount ? 1 : 0.5}
        // Subtle inner shadow effect
        shadowColor="rgba(0,0,0,0.3)"
        shadowRadius={4}
        shadowOpacity={1}
        shadowOffset={{ width: 0, height: 2 }}
      >
        {/* Icon with glow background */}
        <YStack position="relative">
          <YStack
            position="absolute"
            top={-2}
            left={-2}
            right={-2}
            bottom={-2}
            borderRadius={1000}
            bg={color}
            opacity={0.15}
          />
          <GameIcon name={icon} size={16} tintColor={color} />
        </YStack>

        {/* Amount with 3D text effect */}
        <Text
          fontSize={13}
          fontWeight="900"
          color="$text"
          textShadowColor="rgba(0,0,0,0.3)"
          textShadowRadius={1}
        >
          {amount}
        </Text>
      </XStack>
    </YStack>
  );
}
