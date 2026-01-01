import { useTranslation } from "react-i18next";
import { type ColorTokens, Text, XStack, YStack } from "tamagui";
import { Card } from "@/components/common/Card";
import type { ResourceLoot } from "@/db/resources";
import type { ResourceCode } from "@/db/schema";

const RESOURCE_EMOJI: Record<ResourceCode, string> = {
  gold: "💰",
  wood: "🪵",
  stone: "🪨",
  fire: "🔥",
  water: "💧",
  wind: "💨",
  grain: "🌾",
};

function getResourceBgColor(resource: ResourceCode): ColorTokens {
  switch (resource) {
    case "gold":
      return "$pastelYellow";
    case "wood":
      return "$pastelPink"; // Arms - pink
    case "stone":
      return "$pastelBlue"; // Back - blue
    case "fire":
      return "$pastelYellow"; // Chest - yellow
    case "water":
      return "$pastelGreen"; // Abs - green
    case "wind":
      return "$pastelPurple"; // Shoulders - purple
    case "grain":
      return "$pastelOrange"; // Legs - orange
    default:
      return "$bgLight";
  }
}

type Props = {
  loot: ResourceLoot;
};

export function LootDisplay({ loot }: Props) {
  const { t } = useTranslation();

  // Combine gold and materials for display
  const hasLoot = loot.gold > 0 || loot.materials.length > 0;

  if (!hasLoot) return null;

  return (
    <Card width="100%" maxW={520} bg="$bgLight" gap="$3">
      <Text
        fontWeight="800"
        fontSize={14}
        color="$color"
        opacity={0.7}
        textTransform="uppercase"
        style={{ textAlign: "center" }}
      >
        {t("session.loot_title")}
      </Text>

      <XStack gap="$3" justify="center" flexWrap="wrap">
        {/* Gold always first */}
        {loot.gold > 0 && (
          <YStack
            items="center"
            gap="$1"
            bg="$pastelYellow"
            p="$3"
            rounded="$4"
            borderWidth={2}
            borderColor="$color"
            minW={80}
          >
            <Text fontSize={28}>{RESOURCE_EMOJI.gold}</Text>
            <Text fontWeight="900" fontSize={18} color="$color">
              +{loot.gold}
            </Text>
            <Text fontSize={10} fontWeight="700" color="$color" opacity={0.7}>
              {t("resources.gold")}
            </Text>
          </YStack>
        )}

        {/* Materials */}
        {loot.materials.map(({ resource, amount }) => (
          <YStack
            key={resource}
            items="center"
            gap="$1"
            bg={getResourceBgColor(resource)}
            p="$3"
            rounded="$4"
            borderWidth={2}
            borderColor="$color"
            minW={80}
          >
            <Text fontSize={28}>{RESOURCE_EMOJI[resource]}</Text>
            <Text fontWeight="900" fontSize={18} color="$color">
              +{amount}
            </Text>
            <Text fontSize={10} fontWeight="700" color="$color" opacity={0.7}>
              {t(`resources.${resource}`)}
            </Text>
          </YStack>
        ))}
      </XStack>
    </Card>
  );
}
