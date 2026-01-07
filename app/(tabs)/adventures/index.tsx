import { eq } from "drizzle-orm";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList } from "react-native";
import { Button, Text, XStack, YStack } from "tamagui";
import { useDatabase } from "@/src/components/DatabaseProvider";
import { adventures, quests } from "@/src/db/schema";
import { useGameIcon } from "@/src/hooks/useGameIcon";

type Adventure = typeof adventures.$inferSelect & {
  quest: typeof quests.$inferSelect | null;
};

export default function AdventuresScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { db } = useDatabase();
  const { GameIcon } = useGameIcon();

  const [adventuresList, setAdventuresList] = useState<Adventure[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    db.select({
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
      .where(eq(adventures.isActive, 1))
      .orderBy(adventures.sortOrder)
      .all()
      .then((data) => {
        setAdventuresList(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [db]);

  const renderAdventureCard = ({ item }: { item: Adventure }) => {
    const title = i18n.language === "fr" ? item.frTitle : item.enTitle;
    const description = i18n.language === "fr" ? item.frDescription : item.enDescription;
    const isBoss = item.kind === "boss";

    return (
      <Button unstyled onPress={() => router.push(`/adventures/${item.id}`)} mb="$3">
        <YStack
          bg="$glassBg"
          borderColor={isBoss ? "$error" : "$borderStrong"}
          borderWidth={isBoss ? 2 : 1}
          borderRadius="$4"
          p="$4"
          pressStyle={{ opacity: 0.8, scale: 0.98 }}
        >
          {isBoss && (
            <XStack
              ai="center"
              gap="$2"
              mb="$2"
              bg="$error"
              px="$2"
              py="$1"
              borderRadius="$2"
              alignSelf="flex-start"
            >
              <GameIcon name="skull" size={16} color="$text" />
              <Text color="$text" fontSize="$2" fontWeight="bold">
                {t("adventures.epic_battle")}
              </Text>
            </XStack>
          )}

          <Text color="$text" fontSize="$6" fontWeight="bold" mb="$2">
            {title || t("adventures.untitled")}
          </Text>

          {item.quest && (
            <XStack gap="$2" mb="$2" flexWrap="wrap">
              {item.quest.estimatedMinutes && (
                <YStack
                  bg="$glassBg"
                  borderColor="$borderStrong"
                  borderWidth={1}
                  px="$2"
                  py="$1"
                  borderRadius="$2"
                >
                  <Text color="$textSecondary" fontSize="$2">
                    {item.quest.estimatedMinutes} min
                  </Text>
                </YStack>
              )}

              {item.quest.difficulty && (
                <YStack
                  bg={
                    item.quest.difficulty === "Beginner"
                      ? "$success"
                      : item.quest.difficulty === "Intermediate"
                        ? "$warning"
                        : "$error"
                  }
                  px="$2"
                  py="$1"
                  borderRadius="$2"
                >
                  <Text color="$text" fontSize="$2" fontWeight="600">
                    {t(`quests.difficulty_${item.quest.difficulty.toLowerCase()}`)}
                  </Text>
                </YStack>
              )}

              {isBoss && item.bossTotalHp && (
                <YStack bg="$error" px="$2" py="$1" borderRadius="$2">
                  <Text color="$text" fontSize="$2" fontWeight="600">
                    {item.bossTotalHp} HP
                  </Text>
                </YStack>
              )}
            </XStack>
          )}

          <Text color="$textSecondary" fontSize="$3" numberOfLines={3}>
            {description || t("adventures.no_description")}
          </Text>
        </YStack>
      </Button>
    );
  };

  return (
    <YStack f={1} bg="$bgDark">
      <YStack p="$4" gap="$3" borderBottomWidth={1} borderBottomColor="$borderStrong">
        <Text color="$text" fontSize="$8" fontWeight="bold">
          {t("adventures.title")}
        </Text>
        <Text color="$textSecondary" fontSize="$4">
          {t("adventures.subtitle")}
        </Text>
      </YStack>

      {loading ? (
        <YStack f={1} ai="center" jc="center">
          <Text color="$textSecondary">{t("common.loading")}</Text>
        </YStack>
      ) : (
        <FlatList
          data={adventuresList}
          renderItem={renderAdventureCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 }}
          ListEmptyComponent={
            <YStack ai="center" jc="center" py="$8">
              <GameIcon name="map" size={64} color="$textSecondary" />
              <Text color="$textSecondary" fontSize="$5" textAlign="center" mt="$4">
                {t("adventures.empty_title")}
              </Text>
              <Text color="$textSecondary" fontSize="$3" textAlign="center" mt="$2">
                {t("adventures.empty_subtitle")}
              </Text>
            </YStack>
          }
        />
      )}
    </YStack>
  );
}
