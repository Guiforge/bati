import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, XStack, YStack } from "tamagui";
import { Card } from "@/src/components/common/Card";
import type { ResourceLoot } from "@/src/db/resources";
import type { ResourceCode } from "@/src/db/schema";

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
    <Card width="100%" maxW={520} bg="$glassBg" gap="$3" borderColor="$glassBorder" borderWidth={1}>
      <Text
        fontWeight="800"
        fontSize={14}
        color="$textSecondary"
        textTransform="uppercase"
        letterSpacing={3}
        fontFamily="$heading"
        textAlign="center"
      >
        {t("session.loot_title")}
      </Text>

      <XStack gap="$3" justify="center" flexWrap="wrap">
        {allItems.map((item, index) => {
          const isVisible = index < visibleCount;
          const isGold = item.resource === "gold";
          const accent = isGold ? "$gold" : "$ethereal";
          const glow = isGold ? "$goldGlow" : "$etherealGlow";
          return (
            <YStack
              key={item.key}
              items="center"
              gap="$1"
              bg="$bgOverlay"
              p="$4"
              rounded="$4"
              borderWidth={1}
              borderColor={accent}
              minW={80}
              shadowColor={glow}
              shadowOpacity={0.65}
              shadowRadius={18}
              animation="bouncy"
              opacity={isVisible ? 1 : 0}
              scale={isVisible ? 1 : 0.3}
              y={isVisible ? 0 : 20}
            >
              <Text
                fontWeight="900"
                fontSize={22}
                color={accent}
                fontFamily="$heading"
                textAlign="center"
              >
                +{item.amount}
              </Text>
              <Text fontSize={12} fontWeight="700" color="$text" opacity={0.85}>
                {t(`resources.${item.resource}`)}
              </Text>
            </YStack>
          );
        })}
      </XStack>
    </Card>
  );
}
