import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Spinner, Text, XStack, YStack } from "tamagui";
import { resolveImageAsset } from "@/src/constants/assetMap";
import {
  type ActiveAdventureRun,
  getAdventureById,
  getAnyActiveAdventureRun,
} from "@/src/db/adventures";
import { Difficulty, getQuestById, isValidatedQuest, type Quest } from "@/src/db/quests";
import { GameIcon } from "@/src/hooks/useGameIcon";
import { useSessionStore } from "@/src/stores/session";

type ActiveAdventureState = {
  adventure: {
    id: number;
    enTitle: string;
    frTitle: string;
    imagePath: string | null;
  };
  run: ActiveAdventureRun;
  currentQuest: Quest | null;
};

export default function ContinueAdventureModal() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const startSession = useSessionStore((state) => state.startSession);

  const [state, setState] = useState<ActiveAdventureState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadActiveAdventure() {
      try {
        const result = await getAnyActiveAdventureRun();
        if (!result) {
          setLoading(false);
          router.back();
          return;
        }

        const adventureData = await getAdventureById(result.adventureId);
        if (!adventureData) {
          setLoading(false);
          router.back();
          return;
        }

        const activeStep = result.activeRun.activeStep;
        let currentQuest: Quest | null = null;
        if (activeStep) {
          currentQuest = await getQuestById(activeStep.questId, Difficulty.Medium);
        }

        setState({
          adventure: {
            id: adventureData.id,
            enTitle: adventureData.enTitle,
            frTitle: adventureData.frTitle,
            imagePath: adventureData.imagePath,
          },
          run: result.activeRun,
          currentQuest,
        });
      } catch {
        router.back();
      } finally {
        setLoading(false);
      }
    }
    loadActiveAdventure();
  }, [router]);

  const handleClose = () => {
    router.back();
  };

  const handleStartSession = async () => {
    if (!state?.currentQuest || !isValidatedQuest(state.currentQuest)) return;
    if (!state.run.activeStep) return;

    await startSession(state.currentQuest, Difficulty.Medium, {
      adventureRunStepId: state.run.activeStep.id,
    });
    router.replace("/session");
  };

  if (loading || !state) {
    return (
      <Modal visible transparent animationType="fade">
        <YStack flex={1} bg="rgba(0,0,0,0.9)" justify="center" items="center">
          <Spinner size="large" color="$primary" />
        </YStack>
      </Modal>
    );
  }

  const { adventure, run, currentQuest } = state;
  const title = i18n.language === "fr" ? adventure.frTitle : adventure.enTitle;
  const imageSource = resolveImageAsset(adventure.imagePath);
  const _activeStep = run.activeStep;

  const completedSteps = run.steps.filter((s) => s.status === "completed").length;
  const totalSteps = run.steps.length;
  const currentChapter = completedSteps + 1;

  const questTitle = currentQuest ? currentQuest.enTitle || currentQuest.frTitle : "";

  const exerciseList =
    currentQuest?.exercises.map((qe) => ({
      name: i18n.language === "fr" ? qe.exercise.frName : qe.exercise.enName,
      target: qe.target.type === "reps" ? `${qe.target.value} reps` : `${qe.target.value}s`,
    })) || [];

  return (
    <Modal visible transparent animationType="slide">
      <YStack flex={1} bg="rgba(0,0,0,0.95)">
        {/* Hero Image */}
        <YStack height={280} position="relative">
          <Image
            source={imageSource}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
          />
          <LinearGradient
            colors={["transparent", "rgba(11, 15, 25, 1)"]}
            locations={[0, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: "50%",
            }}
          />

          <Pressable
            onPress={handleClose}
            style={{
              position: "absolute",
              top: insets.top + 12,
              right: 16,
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "rgba(0,0,0,0.6)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text color="white" fontSize={24}>
              ×
            </Text>
          </Pressable>
        </YStack>

        {/* Content */}
        <YStack flex={1} px="$4" pt="$4" gap="$4">
          {/* Adventure Title */}
          <YStack gap="$2">
            <XStack items="center" gap="$2">
              <GameIcon name="lorc/fire-silhouette" size={16} tintColor="$primary" />
              <Text fontSize={12} fontWeight="900" color="$primary" textTransform="uppercase">
                {t("home.active_adventure", "ACTIVE ADVENTURE")}
              </Text>
            </XStack>
            <Text fontSize={24} fontWeight="900" color="$text">
              {title}
            </Text>
            <Text fontSize={14} color="$textSecondary">
              {t("home.chapter", "CHAPTER")} {currentChapter} / {totalSteps}
            </Text>
          </YStack>

          {/* Current Quest */}
          <YStack
            bg="$glassBg"
            borderWidth={1}
            borderColor="$primary"
            borderRadius="$4"
            p="$4"
            gap="$3"
          >
            <Text fontSize={16} fontWeight="900" color="$text">
              {questTitle}
            </Text>
            <YStack gap="$2">
              {exerciseList.slice(0, 4).map((ex) => (
                <XStack key={`${ex.name}-${ex.target}`} items="center" gap="$2">
                  <Text color="$primary" fontSize={12}>
                    •
                  </Text>
                  <Text color="$textSecondary" fontSize={13}>
                    {ex.name} — {ex.target}
                  </Text>
                </XStack>
              ))}
              {exerciseList.length > 4 && (
                <Text color="$textSecondary" fontSize={12} opacity={0.7}>
                  +{exerciseList.length - 4} {t("adventures.more_exercises", "more")}
                </Text>
              )}
            </YStack>
          </YStack>

          {/* Actions */}
          <YStack gap="$3" mt="auto" pb={insets.bottom + 16}>
            <Button
              size="$5"
              height={56}
              bg="$primary"
              color="white"
              fontWeight="900"
              fontSize={16}
              borderRadius={28}
              onPress={handleStartSession}
              pressStyle={{ opacity: 0.9, scale: 0.98 }}
              shadowColor="$primaryGlow"
              shadowRadius={16}
              shadowOpacity={0.5}
              disabled={!currentQuest || !isValidatedQuest(currentQuest)}
            >
              {t("adventures.start_session", "START SESSION")}
            </Button>

            <Button
              size="$4"
              height={48}
              bg="transparent"
              borderWidth={1}
              borderColor="rgba(110, 69, 226, 0.4)"
              color="$textSecondary"
              fontWeight="600"
              fontSize={15}
              borderRadius={24}
              onPress={handleClose}
              pressStyle={{ opacity: 0.7 }}
            >
              {t("common.cancel", "Cancel")}
            </Button>
          </YStack>
        </YStack>
      </YStack>
    </Modal>
  );
}
