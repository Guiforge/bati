import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { Text, XStack, YStack } from "tamagui";
import { monsterName } from "@/components/adventures/monsterName";
import { Chip } from "@/components/common/Chip";
import { type BossAssetKey, getBossAsset } from "@/constants/assetMap";
import type { Monster } from "@/db/heroAdventures";
import { MUSCLE_LABELS } from "@/db/labels";
import type { AppLanguage } from "@/src/i18n/deviceLanguage";

export type EditorEnd = { kind: "route" } | { kind: "boss"; monster: BossAssetKey };

type Props = {
  end: EditorEnd;
  monsters: readonly Monster[];
  language: AppLanguage;
  /** The pool at the hero's level for the steps as drafted, or null while it is read. */
  hp: number | null;
  /** Every step is an outing: they walk, they do not hit. */
  outingsOnly: boolean;
  frozen: boolean;
  onChange: (end: EditorEnd) => void;
};

/** How the adventure ends: a route, or a boss picked among the painted ones. */
export function EditorEndSection({
  end,
  monsters,
  language,
  hp,
  outingsOnly,
  frozen,
  onChange,
}: Props) {
  const { t } = useTranslation();
  const label = (m: Monster["weakness"]) => (m ? (MUSCLE_LABELS[m]?.[language] ?? m) : "");

  return (
    <YStack gap="$3" opacity={frozen ? 0.6 : 1} pointerEvents={frozen ? "none" : "auto"}>
      <XStack gap="$2">
        <Chip
          testID="editor-end-route"
          label={t("adventures.editor_end_route")}
          tone={end.kind === "route" ? "primary" : "default"}
          onPress={() => onChange({ kind: "route" })}
        />
        <Chip
          testID="editor-end-boss"
          label={t("adventures.editor_end_boss")}
          tone={end.kind === "boss" ? "primary" : "default"}
          onPress={() =>
            onChange(
              end.kind === "boss"
                ? end
                : { kind: "boss", monster: monsters[0]?.key ?? "stone_golem" },
            )
          }
        />
      </XStack>

      {end.kind === "boss" ? (
        <YStack gap="$3">
          <XStack flexWrap="wrap" gap="$2">
            {monsters.map((m) => {
              const selected = end.monster === m.key;
              return (
                <YStack
                  key={m.key}
                  testID={`editor-monster-${m.key}`}
                  onPress={() => onChange({ kind: "boss", monster: m.key })}
                  width="48%"
                  gap="$1"
                  p="$2"
                  bg="$background"
                  borderWidth={2}
                  borderColor={selected ? "$primaryText" : "$borderStrong"}
                  rounded="$3"
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={monsterName(m, language)}
                >
                  <Image
                    source={getBossAsset(m.bossImagePath)}
                    style={{ width: "100%", aspectRatio: 1, borderRadius: 8 }}
                    contentFit="cover"
                    accessible={false}
                  />
                  <Text fontWeight="700" color="$text" numberOfLines={1}>
                    {monsterName(m, language)}
                  </Text>
                  {m.weakness ? (
                    <Text fontSize={12} color="$textSecondary">
                      {t("adventures.editor_boss_weak", { muscle: label(m.weakness) })}
                    </Text>
                  ) : null}
                  {m.resistance ? (
                    <Text fontSize={12} color="$textSecondary">
                      {t("adventures.editor_boss_resists", { muscle: label(m.resistance) })}
                    </Text>
                  ) : null}
                </YStack>
              );
            })}
          </XStack>
          {hp !== null ? (
            <Text fontSize={13} color="$textSecondary">
              {t("adventures.editor_boss_hp", { hp })}
            </Text>
          ) : null}
          {outingsOnly ? (
            <Text testID="editor-outings-no-hit" fontSize={13} color="$textSecondary">
              {t("adventures.editor_outings_no_hit")}
            </Text>
          ) : null}
        </YStack>
      ) : null}
    </YStack>
  );
}
