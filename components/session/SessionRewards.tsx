import { useTranslation } from "react-i18next";
import { Text, XStack, YStack } from "tamagui";
import { Card } from "@/components/common/Card";
import { buildingNames } from "@/constants/buildingNames";
import { buildingDefinitions } from "@/db/schema";
import { getLevelTitle } from "@/db/userLevel";
import type { useSessionStore } from "@/stores/session";
import { LootDisplay } from "./LootDisplay";
import { NewRecordsBadge } from "./NewRecordsBadge";

type SaveResult = Awaited<ReturnType<ReturnType<typeof useSessionStore.getState>["saveSession"]>>;

/** The reveal content of the victory screen — rendered once the session is saved. */
export function SessionRewards({ result, language }: { result: SaveResult; language: string }) {
  const { t } = useTranslation();
  const isFr = language === "fr";

  const buildingRows = [
    ...(result.buildings?.newUnlocks ?? []).map((b) => ({
      key: `unlock-${b.buildingType}`,
      buildingType: b.buildingType,
      label: t("session.building_unlocked"),
    })),
    ...(result.buildings?.levelUps ?? []).map((b) => ({
      key: `levelup-${b.buildingType}`,
      buildingType: b.buildingType,
      label: t("session.building_level", { level: b.newLevel }),
    })),
  ];

  return (
    <>
      {/* Level up (inline, not a blocking modal) */}
      {result.levelUp && (
        <Card width="100%" maxW={520} bg="$pastelPurple" borderColor="$primary">
          <XStack items="center" gap="$3">
            <Text fontSize={40}>🆙</Text>
            <YStack flex={1}>
              <Text fontWeight="700" fontSize={13} color="$primary" textTransform="uppercase">
                {t("session.level_up", "Level Up!")}
              </Text>
              <Text fontWeight="700" fontSize={20} color="$text">
                {t("session.level_label", "Level")} {result.levelUp.newLevel} ·{" "}
                {isFr
                  ? getLevelTitle(result.levelUp.newLevel).fr
                  : getLevelTitle(result.levelUp.newLevel).en}
              </Text>
            </YStack>
          </XStack>
        </Card>
      )}

      {/* New personal records */}
      {result.newRecords.length > 0 && <NewRecordsBadge records={result.newRecords} />}

      {/* Achievements unlocked (previously computed but never shown) */}
      {result.newAchievements.length > 0 && (
        <Card width="100%" maxW={520} bg="$pastelYellow" borderColor="$primary" gap="$3">
          <Text fontWeight="700" fontSize={16} color="$primary" style={{ textAlign: "center" }}>
            {result.newAchievements.length === 1
              ? t("achievements.new_unlock")
              : t("achievements.new_unlocks", { count: result.newAchievements.length })}
          </Text>
          <YStack gap="$2">
            {result.newAchievements.map((a) => (
              <XStack
                key={a.code}
                bg="$background"
                p="$2"
                px="$3"
                rounded="$3"
                borderWidth={1}
                borderColor="$borderStrong"
                items="center"
                gap="$3"
              >
                <Text fontSize={24}>{a.definition.icon}</Text>
                <YStack flex={1}>
                  <Text fontWeight="700" fontSize={14} color="$color">
                    {isFr ? a.definition.frTitle : a.definition.enTitle}
                  </Text>
                  <Text fontSize={12} color="$color" opacity={0.7}>
                    {isFr ? a.definition.frDescription : a.definition.enDescription}
                  </Text>
                </YStack>
              </XStack>
            ))}
          </YStack>
        </Card>
      )}

      {/* Loot (shown directly, no chest gate) */}
      <LootDisplay loot={result.loot} />

      {/* Village upgrades (inline rows, was a queue of full-screen modals) */}
      {buildingRows.length > 0 && (
        <Card width="100%" maxW={520} bg="$surface" gap="$3">
          <Text
            fontWeight="700"
            fontSize={14}
            color="$textSecondary"
            textTransform="uppercase"
            style={{ textAlign: "center" }}
          >
            {t("session.village_upgrades")}
          </Text>
          <YStack gap="$2">
            {buildingRows.map((b) => (
              <XStack
                key={b.key}
                bg="$background"
                p="$2"
                px="$3"
                rounded="$3"
                borderWidth={1}
                borderColor="$borderStrong"
                items="center"
                gap="$3"
              >
                <Text fontSize={24}>{buildingDefinitions[b.buildingType]?.emoji ?? "🏠"}</Text>
                <Text flex={1} fontWeight="700" fontSize={14} color="$color">
                  {buildingNames[b.buildingType]?.[isFr ? "fr" : "en"] ?? b.buildingType}
                </Text>
                <Text fontWeight="700" fontSize={13} color="$primary">
                  {b.label}
                </Text>
              </XStack>
            ))}
          </YStack>
        </Card>
      )}
    </>
  );
}
