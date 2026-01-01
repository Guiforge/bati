import { Card } from "@/components/common/Card";
import type { ResourceLoot } from "@/db/resources";
import type { ResourceCode } from "@/db/schema";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { type ColorTokens, Text, XStack, YStack } from "tamagui";

const RESOURCE_EMOJI: Record<ResourceCode, string> = {
  gold: "💰",
  essence: "✨",
  boss_token: "🏆",
};

function getResourceBgColor(resource: ResourceCode): ColorTokens {
  switch (resource) {
    case "gold":
      return "$pastelYellow";
    case "essence":
      return "$pastelPurple"; // Essence - purple (magical)
    case "boss_token":
      return "$pastelOrange"; // Special - orange
    default:
      return "$bgLight";
  }
}

type Props = {
  loot: ResourceLoot;
};

// Stagger delay per item in ms
const STAGGER_DELAY = 120;

export function LootDisplay({ loot }: Props) {
  const { t } = useTranslation();
  const [visibleCount, setVisibleCount] = useState(0);

  // Combine all items for indexing
  const allItems = useMemo(() => {
    const items: Array<{
      key: string;
      resource: ResourceCode;
      amount: number;
    }> = [];

    if (loot.gold > 0) {
      items.push({ key: "gold", resource: "gold", amount: loot.gold });
    }
    for (const m of loot.materials) {
      items.push({ key: m.resource, resource: m.resource, amount: m.amount });
    }
    return items;
  }, [loot.gold, loot.materials]);

  const totalItems = allItems.length;

  // Staggered reveal
  useEffect(() => {
    if (visibleCount >= totalItems) return;
    const timer = setTimeout(() => {
      setVisibleCount((c) => c + 1);
    }, STAGGER_DELAY);
    return () => clearTimeout(timer);
  }, [visibleCount, totalItems]);

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
        {allItems.map((item, index) => {
          const isVisible = index < visibleCount;
          return (
            <YStack
              key={item.key}
              items="center"
              gap="$1"
              bg={getResourceBgColor(item.resource)}
              p="$3"
              rounded="$4"
              borderWidth={2}
              borderColor="$color"
              minW={80}
              animation="bouncy"
              opacity={isVisible ? 1 : 0}
              scale={isVisible ? 1 : 0.3}
              y={isVisible ? 0 : 20}
            >
              <Text fontSize={28}>{RESOURCE_EMOJI[item.resource]}</Text>
              <Text fontWeight="900" fontSize={18} color="$color">
                +{item.amount}
              </Text>
              <Text fontSize={10} fontWeight="700" color="$color" opacity={0.7}>
                {t(`resources.${item.resource}`)}
              </Text>
            </YStack>
          );
        })}
      </XStack>
    </Card>
  );
}
