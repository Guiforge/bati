import { useTranslation } from "react-i18next";
import { Text, XStack, YStack } from "tamagui";
import { Card } from "@/components/common/Card";
import { GameIcon } from "@/components/common/GameIcon";
import { OathFulfilledCard } from "@/components/oath/OathFulfilledCard";
import { getLevelTitle } from "@/db/userLevel";
import type { useSessionStore } from "@/stores/session";
import { NewRecordsBadge } from "./NewRecordsBadge";

type SaveResult = Awaited<ReturnType<ReturnType<typeof useSessionStore.getState>["saveSession"]>>;

// Shared bouncy reveal for each reward card.
const revealProps = {
  animation: "bouncy",
  enterStyle: { opacity: 0, scale: 0.92, y: 14 },
} as const;

/** The reveal content of the victory screen — rendered once the session is saved. */
export function SessionRewards({ result, language }: { result: SaveResult; language: string }) {
  const { t } = useTranslation();
  const isFr = language === "fr";

  const hasRewards =
    !!result.levelUp ||
    result.newRecords.length > 0 ||
    result.newAchievements.length > 0 ||
    !!result.fulfilledOath;

  return (
    <>
      {/* Oath fulfilled — the user's own promise, so it leads */}
      {result.fulfilledOath !== null && <OathFulfilledCard oath={result.fulfilledOath} />}

      {/* Level up */}
      {result.levelUp && (
        <Card
          {...revealProps}
          width="100%"
          maxW={520}
          bg="$pastelPurple"
          borderColor="$glassBorder"
        >
          <XStack items="center" gap="$3">
            <YStack
              width={52}
              height={52}
              rounded={26}
              bg="$background"
              borderWidth={2}
              borderColor="$glassBorder"
              items="center"
              justify="center"
            >
              <GameIcon name="star" size={30} color="$primary" />
            </YStack>
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

      {/* Achievements unlocked — the centerpiece of this screen */}
      {result.newAchievements.length > 0 && (
        <Card
          {...revealProps}
          width="100%"
          maxW={520}
          bg="$pastelYellow"
          borderColor="$glassBorder"
          gap="$3"
        >
          <XStack items="center" gap="$2" justify="center">
            <GameIcon name="trophy" size={20} color="$primary" />
            <Text fontWeight="700" fontSize={16} color="$primary" style={{ textAlign: "center" }}>
              {result.newAchievements.length === 1
                ? t("achievements.new_unlock")
                : t("achievements.new_unlocks", { count: result.newAchievements.length })}
            </Text>
            <GameIcon name="trophy" size={20} color="$primary" />
          </XStack>
          <YStack gap="$2">
            {result.newAchievements.map((a) => (
              <XStack
                key={a.code}
                bg="$background"
                p="$3"
                rounded="$4"
                borderWidth={1}
                borderColor="$glassBorder"
                items="center"
                gap="$3"
              >
                <YStack
                  width={48}
                  height={48}
                  rounded={24}
                  bg="$pastelYellow"
                  borderWidth={2}
                  borderColor="$glassBorder"
                  items="center"
                  justify="center"
                >
                  <Text fontSize={26}>{a.definition.icon}</Text>
                </YStack>
                <YStack flex={1}>
                  <Text fontWeight="700" fontSize={15} color="$text">
                    {isFr ? a.definition.frTitle : a.definition.enTitle}
                  </Text>
                  <Text fontSize={12} color="$text" opacity={0.7}>
                    {isFr ? a.definition.frDescription : a.definition.enDescription}
                  </Text>
                </YStack>
              </XStack>
            ))}
          </YStack>
        </Card>
      )}

      {/* Nothing special this session — keep the reveal warm instead of blank */}
      {!hasRewards && (
        <Card
          {...revealProps}
          width="100%"
          maxW={520}
          bg="$surface"
          items="center"
          gap="$1"
          py="$4"
        >
          <Text fontSize={32}>🎉</Text>
          <Text fontWeight="700" fontSize={16} color="$text" style={{ textAlign: "center" }}>
            {t("session.summary_empty_title")}
          </Text>
          <Text fontSize={13} color="$textSecondary" style={{ textAlign: "center" }}>
            {t("session.summary_empty_subtitle")}
          </Text>
        </Card>
      )}
    </>
  );
}
