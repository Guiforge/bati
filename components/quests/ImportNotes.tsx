import { useTranslation } from "react-i18next";
import { Text, XStack, YStack } from "tamagui";
import { Card } from "@/components/common/Card";
import { Info } from "@/components/icons";
import type { Arrivals } from "@/src/questFile";

/**
 * What a received file is about to add, in counts: the quests, the exercises and the photos that
 * arrive with it. Nothing when nothing does (everything is already on this phone).
 */
export function ImportArrives({ arrives }: { arrives: Arrivals }) {
  const { t } = useTranslation();
  const rows = (
    [
      ["quests", arrives.quests],
      ["movements", arrives.movements],
      ["photos", arrives.photos],
    ] as const
  ).filter(([, n]) => n > 0);
  if (rows.length === 0) return null;
  return (
    <Card gap="$2" testID="import-arrives">
      <Text fontWeight="700" fontSize={14} color="$textSecondary">
        {t("quests.import_arrives")}
      </Text>
      {rows.map(([key, n]) => (
        <XStack key={key} gap="$3" justify="space-between">
          <Text flex={1} color="$text">
            {t(`quests.import_arrives_${key}`)}
          </Text>
          <Text fontWeight="700" color="$text">
            {n}
          </Text>
        </XStack>
      ))}
    </Card>
  );
}

/**
 * An exercise that arrives under a name the hero already uses for one of theirs: the two stay side
 * by side, neither replaces the other. Neutral, not a warning: nothing is lost, and the file is
 * not at fault.
 */
export function ImportClashes({ names }: { names: readonly string[] }) {
  const { t } = useTranslation();
  if (names.length === 0) return null;
  return (
    <YStack testID="import-clashes" gap="$2">
      {names.map((name) => (
        <XStack key={name} gap="$2" items="flex-start">
          <Info size={16} color="$textSecondary" />
          <Text flex={1} fontSize={13} color="$textSecondary">
            {t("quests.import_clash", { name })}
          </Text>
        </XStack>
      ))}
    </YStack>
  );
}
