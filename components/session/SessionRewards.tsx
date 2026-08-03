import { Image } from "expo-image";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Text, XStack, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { GameIcon } from "@/components/common/GameIcon";
import { OathFulfilledCard } from "@/components/oath/OathFulfilledCard";
import { LevelPips } from "@/components/village/LevelPips";
import { getBuildingIconAsset, getExerciseAsset, getVillageTierAsset } from "@/constants/assetMap";
import { pickSessionEmptyVariant } from "@/constants/sessionEmptyMessages";
import { getLevelTitle } from "@/db/userLevel";
import { TIER_NAMES } from "@/db/village";
import { localizedTitle } from "@/src/i18n/localized";
import type { useSessionStore } from "@/stores/session";
import { NewRecordsBadge } from "./NewRecordsBadge";

type SaveResult = Awaited<ReturnType<ReturnType<typeof useSessionStore.getState>["saveSession"]>>;

// Shared bouncy reveal for each reward card.
const revealProps = {
  transition: "bouncy",
  enterStyle: { opacity: 0, scale: 0.92, y: 14 },
} as const;

const VILLAGE_GROWTH_SHOWN = 2;

/** The reveal content of the victory screen — rendered once the session is saved. */
export function SessionRewards({
  result,
  language,
  onViewVillage,
}: {
  result: SaveResult;
  language: string;
  onViewVillage: () => void;
}) {
  const { t } = useTranslation();
  const isFr = language === "fr";

  const hasRewards =
    !!result.levelUp ||
    result.newRecords.length > 0 ||
    result.newRungs.length > 0 ||
    result.newAchievements.length > 0 ||
    !!result.fulfilledOath ||
    result.villageGrowth.length > 0;

  // Picked once for this mount of the reveal screen, not re-rolled on every re-render.
  const emptyVariant = useMemo(() => pickSessionEmptyVariant(isFr ? "fr" : "en"), [isFr]);

  return (
    <>
      {/* Oath fulfilled — the user's own promise, so it leads */}
      {result.fulfilledOath !== null && (
        <OathFulfilledCard oath={result.fulfilledOath} bonusXp={result.oathBonusXp} />
      )}

      {/* Level up */}
      {!!result.levelUp && (
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
              <GameIcon name="star" size={30} color="$primaryText" />
            </YStack>
            <YStack flex={1}>
              <Text fontWeight="700" fontSize={13} color="$primaryText" textTransform="uppercase">
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

      {/* Village tier crossed — the biggest village moment there is, bigger than any one
          building leveling up, so it gets the real tier art instead of an icon. */}
      {!!result.tierUp && (
        <Card {...revealProps} width="100%" maxW={520} bg="$pastelPurple" p="$0" overflow="hidden">
          <Image
            source={getVillageTierAsset(result.tierUp.newTier)}
            style={{ width: "100%", height: 140 }}
            contentFit="cover"
          />
          <YStack p="$4" gap="$1" items="center">
            <Text fontWeight="700" fontSize={13} color="$primaryText" textTransform="uppercase">
              {t("session.village_tier_up_title", "Your village grew!")}
            </Text>
            <Text fontWeight="700" fontSize={20} color="$text" style={{ textAlign: "center" }}>
              {isFr ? TIER_NAMES[result.tierUp.newTier].fr : TIER_NAMES[result.tierUp.newTier].en}
            </Text>
          </YStack>
        </Card>
      )}

      {/* Village grows — a building rose because of this session, nothing to manage */}
      {result.villageGrowth.length > 0 && (
        <Card {...revealProps} width="100%" maxW={520} bg="$surface2" gap="$3">
          <XStack items="center" gap="$2" justify="center">
            <GameIcon name="castle" size={22} color="$primaryText" />
            <Text
              fontWeight="700"
              fontSize={16}
              color="$primaryText"
              style={{ textAlign: "center" }}
            >
              {t("session.village_growth_title", "Your village grows")}
            </Text>
            <GameIcon name="castle" size={22} color="$primaryText" />
          </XStack>
          <YStack gap="$2">
            {result.villageGrowth.slice(0, VILLAGE_GROWTH_SHOWN).map((g) => (
              <XStack
                key={g.code}
                bg="$background"
                p="$3"
                rounded="$4"
                borderWidth={1}
                borderColor="$glassBorder"
                items="center"
                gap="$3"
              >
                {/* `newLevel`, not the default: this card celebrates a building that just rose,
                    and omitting the level fell back to 0 — the roughest of its three paintings —
                    so the screen announcing the growth showed the crudest form of the thing that
                    had just grown. The pips beside it were already reading `newLevel`. */}
                <Image
                  source={getBuildingIconAsset(g.code, g.relatedMuscle, g.newLevel)}
                  style={{ width: 40, height: 40 }}
                  contentFit="contain"
                />
                <YStack flex={1} gap="$1">
                  <Text fontWeight="700" fontSize={14} color="$text">
                    {isFr ? g.frName : g.enName}
                  </Text>
                  <LevelPips level={g.newLevel} />
                </YStack>
              </XStack>
            ))}
          </YStack>
          {result.villageGrowth.length > VILLAGE_GROWTH_SHOWN && (
            <Text fontSize={12} color="$text" opacity={0.7} style={{ textAlign: "center" }}>
              {t("session.village_growth_more", {
                count: result.villageGrowth.length - VILLAGE_GROWTH_SHOWN,
                defaultValue: `+${result.villageGrowth.length - VILLAGE_GROWTH_SHOWN} more`,
              })}
            </Text>
          )}
          <AppButton backgroundColor="$surface" onPress={onViewVillage}>
            <Text color="$text" fontSize={14} fontWeight="700">
              {t("session.village_growth_cta", "View my village")}
            </Text>
          </AppButton>
        </Card>
      )}

      {/* New personal records */}
      {result.newRecords.length > 0 && <NewRecordsBadge records={result.newRecords} />}

      {/* Variations unlocked — progressive overload without weights is a harder movement, so this
          is the moment that actually moves a bodyweight athlete forward. */}
      {result.newRungs.length > 0 && (
        <Card {...revealProps} width="100%" maxW={520} bg="$surface2" gap="$3">
          <XStack items="center" gap="$2" justify="center">
            <GameIcon name="muscle" size={20} color="$primaryText" />
            <Text
              fontWeight="700"
              fontSize={16}
              color="$primaryText"
              style={{ textAlign: "center" }}
            >
              {result.newRungs.length === 1
                ? t("progression.new_rung", "New step unlocked")
                : t("progression.new_rungs", {
                    count: result.newRungs.length,
                    defaultValue: `${result.newRungs.length} new steps unlocked`,
                  })}
            </Text>
            <GameIcon name="muscle" size={20} color="$primaryText" />
          </XStack>
          <YStack gap="$2">
            {result.newRungs.map((step) => (
              <XStack
                key={step.next.id}
                bg="$background"
                p="$3"
                rounded="$4"
                borderWidth={1}
                borderColor="$glassBorder"
                items="center"
                gap="$3"
              >
                <YStack width={56} height={56} rounded="$4" overflow="hidden" bg="$surface">
                  <Image
                    source={getExerciseAsset(step.next.imagePath)}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                  />
                </YStack>
                <YStack flex={1}>
                  <Text fontWeight="700" fontSize={15} color="$text">
                    {isFr ? step.next.frName : step.next.enName}
                  </Text>
                  <Text fontSize={12} color="$text" opacity={0.7}>
                    {t("progression.new_rung_from", {
                      name: isFr ? step.from.frName : step.from.enName,
                      defaultValue: `You have mastered ${isFr ? step.from.frName : step.from.enName}`,
                    })}
                  </Text>
                </YStack>
              </XStack>
            ))}
          </YStack>
        </Card>
      )}

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
            <GameIcon name="trophy" size={20} color="$primaryText" />
            <Text
              fontWeight="700"
              fontSize={16}
              color="$primaryText"
              style={{ textAlign: "center" }}
            >
              {result.newAchievements.length === 1
                ? t("achievements.new_unlock")
                : t("achievements.new_unlocks", { count: result.newAchievements.length })}
            </Text>
            <GameIcon name="trophy" size={20} color="$primaryText" />
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
                    {localizedTitle(a.definition, isFr ? "fr" : "en")}
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
            {emptyVariant.title}
          </Text>
          <Text fontSize={13} color="$textSecondary" style={{ textAlign: "center" }}>
            {emptyVariant.subtitle}
          </Text>
        </Card>
      )}
    </>
  );
}
