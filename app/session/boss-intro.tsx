import { eq } from "drizzle-orm";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Text, XStack, YStack } from "tamagui";
import { useDatabase } from "@/src/components/DatabaseProvider";
import { Difficulty, getQuestById, type Quest } from "@/src/db/quests";
import { adventures } from "@/src/db/schema";
import { useGameIcon } from "@/src/hooks/useGameIcon";
import { useSessionStore } from "@/src/stores/session";

type Adventure = typeof adventures.$inferSelect;

export default function BossIntroScreen() {
  const { adventureId } = useLocalSearchParams();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { db } = useDatabase();
  const { GameIcon } = useGameIcon();
  const startSession = useSessionStore((state) => state.startSession);

  const [adventure, setAdventure] = useState<Adventure | null>(null);
  const [quest, setQuest] = useState<Quest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !adventureId) return;

    const loadAdventure = async () => {
      const id = Number.parseInt(adventureId as string, 10);
      if (Number.isNaN(id)) {
        setLoading(false);
        return;
      }

      try {
        const adventureData = db.select().from(adventures).where(eq(adventures.id, id)).get();

        if (!adventureData) {
          setLoading(false);
          return;
        }

        setAdventure(adventureData);

        // Load the full quest with exercises using getQuestById
        if (adventureData.questId) {
          const questData = await getQuestById(adventureData.questId, Difficulty.Medium);
          setQuest(questData);
        }

        setLoading(false);
      } catch {
        setLoading(false);
      }
    };

    loadAdventure();
  }, [db, adventureId]);

  const handleBeginBattle = async () => {
    if (!adventure || !quest) return;

    await startSession(quest, Difficulty.Medium, {
      adventureId: adventure.id,
    });

    router.push("/session/countdown");
  };

  if (loading) {
    return (
      <YStack flex={1} bg="$bgDark" alignItems="center" justifyContent="center">
        <Text color="$textSecondary">{t("common.loading")}</Text>
      </YStack>
    );
  }

  if (!adventure || adventure.kind !== "boss" || !quest) {
    return (
      <YStack flex={1} bg="$bgDark" alignItems="center" justifyContent="center" p="$4">
        <Text color="$text" fontSize={24} fontWeight="bold" mb="$2">
          {t("boss.not_found")}
        </Text>
        <Button onPress={() => router.back()} bg="$primary">
          {t("common.go_back")}
        </Button>
      </YStack>
    );
  }

  const title = i18n.language === "fr" ? adventure.frTitle : adventure.enTitle;
  const description = i18n.language === "fr" ? adventure.frDescription : adventure.enDescription;

  return (
    <YStack flex={1} bg="#0A0A0F">
      <YStack flex={1} alignItems="center" justifyContent="center" p="$6" gap="$6">
        <YStack
          bg="$error"
          width={120}
          height={120}
          alignItems="center"
          justifyContent="center"
          borderRadius={999}
          shadowColor="$error"
          shadowOffset={{ width: 0, height: 8 }}
          shadowOpacity={0.8}
          shadowRadius={24}
        >
          <GameIcon name="skull" size={72} tintColor="$text" />
        </YStack>

        <YStack alignItems="center" gap="$2">
          <Text
            color="$textSecondary"
            fontSize="$3"
            fontWeight="600"
            textTransform="uppercase"
            letterSpacing={2}
          >
            {t("boss.epic_battle")}
          </Text>

          <Text color="$text" fontSize={40} fontWeight="900" textAlign="center" numberOfLines={2}>
            {title}
          </Text>
        </YStack>

        {adventure.bossTotalHp && (
          <YStack
            bg="$glassBg"
            borderColor="$error"
            borderWidth={2}
            px="$5"
            py="$3"
            borderRadius="$4"
          >
            <Text color="$error" fontSize={28} fontWeight="bold" textAlign="center">
              {t("boss.hp_display", { hp: adventure.bossTotalHp })}
            </Text>
          </YStack>
        )}

        <YStack
          bg="$glassBg"
          borderColor="$borderStrong"
          borderWidth={1}
          p="$4"
          borderRadius="$4"
          maxWidth={400}
        >
          <Text color="$textSecondary" fontSize="$4" textAlign="center" lineHeight={24}>
            {description || t("boss.no_description")}
          </Text>
        </YStack>

        {adventure.bossWeaknessMuscle && (
          <XStack alignItems="center" gap="$2" bg="$warning" px="$4" py="$2" borderRadius="$3">
            <GameIcon name="zap" size={20} tintColor="$text" />
            <Text color="$text" fontSize="$3" fontWeight="600">
              {t("boss.weakness")}: {adventure.bossWeaknessMuscle}
            </Text>
          </XStack>
        )}
      </YStack>

      <YStack p="$6" gap="$3">
        <Button
          size="$6"
          bg="$error"
          color="$text"
          fontSize={24}
          fontWeight="900"
          onPress={handleBeginBattle}
          pressStyle={{ opacity: 0.9, scale: 0.98 }}
          shadowColor="$error"
          shadowOffset={{ width: 0, height: 8 }}
          shadowOpacity={0.8}
          shadowRadius={20}
        >
          {t("boss.begin_battle")}
        </Button>

        <Button
          size="$4"
          chromeless
          color="$textSecondary"
          onPress={() => router.back()}
          pressStyle={{ opacity: 0.7 }}
        >
          {t("common.cancel")}
        </Button>
      </YStack>
    </YStack>
  );
}
