import { useEffect, useState } from "react";
import { Text, XStack } from "tamagui";
import { getResourceInventory, type ResourceAmount } from "@/db/resources";
import type { ResourceCode } from "@/db/schema";

const RESOURCE_EMOJI: Record<ResourceCode, string> = {
  gold: "💰",
  wood: "🪵",
  stone: "🪨",
  fire: "🔥",
  water: "💧",
  wind: "🌬️",
  grain: "🌾",
  mana: "🔮",
  leaf: "🍃",
  boss_token: "🏆",
};

// Resources to always show in the header (simplified)
const HEADER_RESOURCES: ResourceCode[] = ["gold", "mana", "leaf", "boss_token"];

type Props = {
  /** Whether to show in compact mode (fewer resources) */
  compact?: boolean;
};

export function ResourceHeader({ compact = false }: Props) {
  const [inventory, setInventory] = useState<ResourceAmount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await getResourceInventory();
        if (!cancelled) {
          setInventory(data);
          setIsLoading(false);
        }
      } catch {
        if (!cancelled) setIsLoading(false);
      }
    }

    load().catch(() => {
      // Error already handled
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return null; // Don't show anything while loading
  }

  // In compact mode, only show gold and top 2 materials
  const resourcesToShow = compact ? (["gold"] as ResourceCode[]) : HEADER_RESOURCES;

  const getAmount = (resource: ResourceCode) =>
    inventory.find((r) => r.resource === resource)?.amount ?? 0;

  return (
    <XStack
      bg="$bgLight"
      px="$4"
      py="$2"
      rounded="$4"
      gap="$4"
      borderWidth={1}
      borderColor="$borderStrong"
      justify="center"
      flexWrap="wrap"
    >
      {resourcesToShow.map((resource) => (
        <XStack key={resource} gap="$1" items="center">
          <Text fontSize={16}>{RESOURCE_EMOJI[resource]}</Text>
          <Text fontWeight="700" fontSize={14} color="$color">
            {formatAmount(getAmount(resource))}
          </Text>
        </XStack>
      ))}
    </XStack>
  );
}

function formatAmount(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}k`;
  }
  return amount.toString();
}
