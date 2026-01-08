import { eq } from "drizzle-orm";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Text, XStack, YStack } from "tamagui";
import { useDatabase } from "@/src/components/DatabaseProvider";
import { adventures, quests, userPreferences } from "@/src/db/schema";
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

    const loadAdventure = async () => {
      try {
        const settings = db.select().from(userPreferences).get();

        if (!settings?.value) {
          setLoading(false);
          return;
        }

        // Parse currentAdventureId from settings value if stored as JSON
        let currentAdventureId: number | undefined;
        try {
          const parsed = JSON.parse(settings.value);
          currentAdventureId = parsed.currentAdventureId;
        } catch {
          // Value is not JSON, skip
        }

        if (!currentAdventureId) {
          setLoading(false);
          return;
        }

        const adventureData = db
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
          .where(eq(adventures.id, currentAdventureId))
          .get();

        setCurrentAdventure(adventureData || null);
        setLoading(false);
      } catch {
        setLoading(false);
      }
    };

    loadAdventure();
  }, [db]);

  if (loading || !currentAdventure) {
    return null;
  }

  const title = i18n.language === "fr" ? currentAdventure.frTitle : currentAdventure.enTitle;
  const isBoss = currentAdventure.kind === "boss";

  const handleContinue = () => {
    router.push(`/(modals)/adventures/${currentAdventure.id}`);
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
      <XStack alignItems="center" gap="$3" mb="$3">
        <YStack
          bg={isBoss ? "$error" : "$primary"}
          width={48}
          height={48}
          alignItems="center"
          justifyContent="center"
          borderRadius={999}
        >
          <GameIcon
            name={isBoss ? "lorc/crowned-skull" : "lorc/treasure-map"}
            size={28}
            tintColor="$text"
          />
        </YStack>

        <YStack flex={1}>
          <Text color="$textSecondary" fontSize="$2" fontWeight="600" textTransform="uppercase">
            {t("home.continue_adventure")}
          </Text>
          <Text color="$text" fontSize={20} fontWeight="bold" numberOfLines={1}>
            {title || t("adventures.untitled")}
          </Text>
        </YStack>
      </XStack>

      {isBoss && (
        <XStack alignItems="center" gap="$2" bg="$error" p="$2" borderRadius="$3" mb="$3">
          <GameIcon name="lorc/lightning-branches" size={20} tintColor="$text" />
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
            <XStack alignItems="center" gap="$2">
              <GameIcon name="lorc/sundial" size={16} tintColor="$textSecondary" />
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
