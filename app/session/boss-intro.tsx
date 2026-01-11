import { eq } from "drizzle-orm";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Text, XStack, YStack } from "tamagui";
import { useDatabase } from "@/src/components/DatabaseProvider";
import { Difficulty, getQuestById, isValidatedQuest, type Quest } from "@/src/db/quests";
import { adventures } from "@/src/db/schema";
import { useGameIcon } from "@/src/hooks/useGameIcon";
import { useSessionStore } from "@/src/stores/session";

type Adventure = typeof adventures.$inferSelect;

/**
 * Boss Intro Screen
 *
 * Displays boss information before starting an epic boss fight:
 * - Boss artwork/icon
 * - Boss name and lore
 * - Boss HP and weakness info
 * - Clear call-to-action button
 */
export default function BossIntroScreen() {
  const { adventureId } = useLocalSearchParams();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
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

  const handleBeginBattle = useCallback(async () => {
    // Use type guard instead of manual validation
    if (!adventure || !isValidatedQuest(quest)) return;

    await startSession(quest, Difficulty.Medium, {
      adventureId: adventure.id,
    });

    router.push("/session");
  }, [adventure, quest, startSession, router]);

  const title = useMemo(
    () => (i18n.language === "fr" ? adventure?.frTitle : adventure?.enTitle),
    [i18n.language, adventure?.frTitle, adventure?.enTitle]
  );

  const description = useMemo(
    () => (i18n.language === "fr" ? adventure?.frDescription : adventure?.enDescription),
    [i18n.language, adventure?.frDescription, adventure?.enDescription]
  );

  if (loading) {
    return (
      <YStack
        flex={1}
        bg="$bgDark"
        alignItems="center"
        justifyContent="center"
        paddingTop={insets.top + 12}
        paddingBottom={insets.bottom + 12}
      >
        <Text color="$textSecondary">{t("common.loading")}</Text>
      </YStack>
    );
  }

  if (!adventure || adventure.kind !== "boss" || !quest) {
    return (
      <YStack
        flex={1}
        bg="$bgDark"
        alignItems="center"
        justifyContent="center"
        p="$4"
        pt={insets.top + 12}
        pb={insets.bottom + 12}
      >
        <Text color="$text" fontSize={24} fontWeight="bold" mb="$2">
          {t("boss.not_found")}
        </Text>
        <Button onPress={() => router.back()} bg="$primary">
          {t("common.go_back")}
        </Button>
      </YStack>
    );
  }

  return (
    <YStack flex={1} bg="$bgDarker" pt={insets.top + 12} pb={insets.bottom + 12}>
      {/* Scrollable content for smaller screens */}
      <YStack flex={1} alignItems="center" justifyContent="center" px="$5" gap="$5">
        {/* Boss Icon - Modernized */}
        <YStack
          bg="$glassBg"
          width={140}
          height={140}
          alignItems="center"
          justifyContent="center"
          borderRadius="$6"
          borderWidth={2}
          borderColor="$error"
          shadowColor="$error"
          shadowOffset={{ width: 0, height: 12 }}
          shadowOpacity={0.6}
          shadowRadius={32}
        >
          <GameIcon name="lorc/crowned-skull" size={80} tintColor="$error" />
        </YStack>

        {/* Boss Title */}
        <YStack alignItems="center" gap="$2">
          <Text
            color="$error"
            fontSize={12}
            fontWeight="800"
            textTransform="uppercase"
            letterSpacing={3}
            fontFamily="$heading"
          >
            {t("boss.epic_battle")}
          </Text>

          <Text
            color="$text"
            fontSize={36}
            fontWeight="900"
            textAlign="center"
            numberOfLines={2}
            fontFamily="$heading"
          >
            {title}
          </Text>
        </YStack>

        {/* Boss HP Display - Compact */}
        {adventure.bossTotalHp && (
          <XStack
            bg="$glassBg"
            borderColor="$error"
            borderWidth={1}
            px="$6"
            py="$3"
            borderRadius="$5"
            alignItems="center"
            gap="$2"
          >
            <Text color="$textSecondary" fontSize={14} fontWeight="700">
              HP:
            </Text>
            <Text color="$error" fontSize={32} fontWeight="900" fontFamily="$body">
              {adventure.bossTotalHp}
            </Text>
          </XStack>
        )}

        {/* Boss Description - Cleaner */}
        {description && (
          <YStack
            bg="$glassBg"
            borderColor="$borderStrong"
            borderWidth={1}
            p="$4"
            borderRadius="$4"
            maxWidth={420}
          >
            <Text color="$textSecondary" fontSize={15} textAlign="center" lineHeight={22}>
              {description}
            </Text>
          </YStack>
        )}

        {/* Boss Weakness Indicator - Modern Badge */}
        {adventure.bossWeaknessMuscle && (
          <XStack
            alignItems="center"
            gap="$2"
            bg="$glassBg"
            borderWidth={1}
            borderColor="$warning"
            px="$4"
            py="$2"
            borderRadius="$4"
          >
            <GameIcon name="lorc/lightning-branches" size={18} tintColor="$warning" />
            <Text color="$warning" fontSize={13} fontWeight="700" textTransform="uppercase">
              {t("boss.weakness")}: {adventure.bossWeaknessMuscle}
            </Text>
          </XStack>
        )}
      </YStack>

      {/* Action Buttons - Bottom */}
      <YStack px="$5" pb="$4" gap="$3">
        <Button
          size="$6"
          bg="$error"
          color="$text"
          fontSize={20}
          fontWeight="900"
          onPress={handleBeginBattle}
          pressStyle={{ opacity: 0.85, scale: 0.97 }}
          shadowColor="$error"
          shadowOffset={{ width: 0, height: 8 }}
          shadowOpacity={0.7}
          shadowRadius={24}
          fontFamily="$heading"
        >
          ⚔️ {t("boss.begin_battle")}
        </Button>

        <Button
          size="$4"
          chromeless
          color="$textSecondary"
          onPress={() => router.back()}
          pressStyle={{ opacity: 0.6 }}
        >
          {t("common.cancel")}
        </Button>
      </YStack>
    </YStack>
  );
}
