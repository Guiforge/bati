import { eq } from "drizzle-orm";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Text, XStack, YStack } from "tamagui";
import { useDatabase } from "@/src/components/DatabaseProvider";
import { adventures, quests, userSettings } from "@/src/db/schema";
import { useGameIcon } from "@/src/hooks/useGameIcon";

type Adventure = typeof adventures.$inferSelect & {
  quest: typeof quests.$inferSelect | null;
};

export function ContinueAdventureCard() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { db } = useDatabase();
  const { GameIcon } = useGameIcon();

  const [currentAdventure, setCurrentAdventure] = useState<Adventure | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    db.select()
      .from(userSettings)
      .get()
      .then((settings) => {
        if (!settings?.currentAdventureId) {
          setLoading(false);
          return;
        }

        return db
          .select({
            id: adventures.id,
            questId: adventures.questId,
            enTitle: adventures.enTitle,
            frTitle: adventures.frTitle,
            enDescription: adventures.enDescription,
            frDescription: adventures.frDescription,
            author: adventures.author,
            sortOrder: adventures.sortOrder,
            kind: adventures.kind,
            isActive: adventures.isActive,
            imagePath: adventures.imagePath,
            bossTotalHp: adventures.bossTotalHp,
            bossWeaknessMuscle: adventures.bossWeaknessMuscle,
            bossResistanceMuscle: adventures.bossResistanceMuscle,
            createdAt: adventures.createdAt,
            updatedAt: adventures.updatedAt,
            quest: quests,
          })
          .from(adventures)
          .leftJoin(quests, eq(adventures.questId, quests.id))
          .where(eq(adventures.id, settings.currentAdventureId))
          .get();
      })
      .then((adventureData) => {
        setCurrentAdventure(adventureData || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [db]);

  if (loading || !currentAdventure) {
    return null;
  }

  const title = i18n.language === "fr" ? currentAdventure.frTitle : currentAdventure.enTitle;
  const isBoss = currentAdventure.kind === "boss";

  const handleContinue = () => {
    router.push(`/adventures/${currentAdventure.id}`);
  };

  return (
    <YStack
      bg="$glassBg"
      borderColor={isBoss ? "$error" : "$primary"}
      borderWidth={2}
      borderRadius="$4"
      p="$4"
      mb="$4"
      shadowColor={isBoss ? "$error" : "$primaryGlow"}
      shadowOffset={{ width: 0, height: 4 }}
      shadowOpacity={0.6}
      shadowRadius={12}
    >
      <XStack ai="center" gap="$3" mb="$3">
        <YStack
          bg={isBoss ? "$error" : "$primary"}
          w={48}
          h={48}
          ai="center"
          jc="center"
          borderRadius="$full"
        >
          <GameIcon name={isBoss ? "skull" : "map"} size={28} color="$text" />
        </YStack>

        <YStack f={1}>
          <Text color="$textSecondary" fontSize="$2" fontWeight="600" textTransform="uppercase">
            {t("home.continue_adventure")}
          </Text>
          <Text color="$text" fontSize="$5" fontWeight="bold" numberOfLines={1}>
            {title || t("adventures.untitled")}
          </Text>
        </YStack>
      </XStack>

      {isBoss && (
        <XStack ai="center" gap="$2" bg="$error" p="$2" borderRadius="$3" mb="$3">
          <GameIcon name="zap" size={20} color="$text" />
          <Text color="$text" fontSize="$3" fontWeight="bold">
            {t("home.boss_ready")}
          </Text>
        </XStack>
      )}

      {currentAdventure.quest && (
        <YStack gap="$2" mb="$3">
          <Text color="$textSecondary" fontSize="$3">
            {t("home.next_quest")}:{" "}
            {i18n.language === "fr"
              ? currentAdventure.quest.frTitle
              : currentAdventure.quest.enTitle}
          </Text>

          {currentAdventure.quest.estimatedMinutes && (
            <XStack ai="center" gap="$2">
              <GameIcon name="clock" size={16} color="$textSecondary" />
              <Text color="$textSecondary" fontSize="$3">
                {currentAdventure.quest.estimatedMinutes} min
              </Text>
            </XStack>
          )}
        </YStack>
      )}

      <Button
        size="$4"
        bg={isBoss ? "$error" : "$primary"}
        color="$text"
        fontWeight="bold"
        onPress={handleContinue}
        pressStyle={{ opacity: 0.8, scale: 0.98 }}
      >
        {isBoss ? t("home.fight_boss") : t("home.continue")}
      </Button>
    </YStack>
  );
}
