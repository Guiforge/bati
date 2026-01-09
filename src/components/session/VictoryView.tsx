import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Share, StyleSheet, useWindowDimensions } from "react-native";
import ConfettiCannon from "react-native-confetti-cannon";
import { Text, YStack } from "tamagui";

import { resolveImageAsset } from "@/src/constants/assetMap";
import { SOUNDS } from "@/src/constants/sounds";
import { previewSessionLoot, type ResourceLoot } from "@/src/db/resources";
import { computeSessionXp } from "@/src/db/xp";
import { useSound } from "@/src/hooks/useSound";
import { useSessionStore } from "@/src/stores/session";
import { useSettingsStore } from "@/src/stores/settings";

import { LootReveal } from "./LootReveal";
import { RewardsManifest } from "./RewardsManifest";

function hasLoot(loot: ResourceLoot) {
  return loot.gold > 0 || loot.materials.length > 0;
}

export function VictoryView() {
  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { language } = useSettingsStore();
  const { playSound } = useSound();

  const {
    quest,
    userLevel,
    startTime,
    totalPausedTime,
    results,
    saveSession,
    quitSession,
    bossFight,
  } = useSessionStore();

  const [hasRevealedLoot, setHasRevealedLoot] = useState(false);
  const [saveResult, setSaveResult] = useState<Awaited<ReturnType<typeof saveSession>> | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);

  const didSaveRef = useRef(false);

  useEffect(() => {
    playSound(SOUNDS.victory);
  }, [playSound]);

  const durationSeconds = useMemo(() => {
    if (!startTime) return 0;
    return Math.floor((Date.now() - startTime - totalPausedTime) / 1000);
  }, [startTime, totalPausedTime]);

  const totalReps = useMemo(() => {
    return results.reduce((sum, r) => {
      return sum + (r.result.type === "reps" ? r.result.value : 0);
    }, 0);
  }, [results]);

  const lootPreview: ResourceLoot = useMemo(() => {
    if (!quest) return { gold: 0, materials: [] };

    const exerciseResults = results.map((r) => {
      const questExercise = quest.exercises.find((qe) => qe.exercise.id === r.exerciseId);
      return {
        exerciseId: r.exerciseId,
        muscles: questExercise?.exercise.muscles ?? [],
        style: questExercise?.exercise.style ?? "strength",
        result: { type: r.result.type as "reps" | "time", value: r.result.value },
      };
    });

    return previewSessionLoot({
      durationSeconds,
      userLevel,
      exerciseResults,
    });
  }, [durationSeconds, quest, results, userLevel]);

  const lootToReveal = saveResult?.loot ?? lootPreview;
  const shouldShowLootReveal = hasLoot(lootToReveal) && !hasRevealedLoot;
  const isManifestActive = !hasLoot(lootToReveal) || hasRevealedLoot;

  // Detect boss defeat (HP reduced to 0 or below) for a bigger confetti moment.
  const isBossDefeat = Boolean(bossFight && bossFight.currentHp <= 0);

  const questTitle = useMemo(() => {
    if (!quest) return "";
    return language === "fr" ? quest.frTitle : quest.enTitle;
  }, [language, quest]);

  useEffect(() => {
    if (!quest || !startTime) return;
    if (didSaveRef.current) return;

    didSaveRef.current = true;
    setIsSaving(true);
    saveSession(null)
      .then((res) => setSaveResult(res))
      .catch(() => {
        // Allow retry on next render.
        didSaveRef.current = false;
      })
      .finally(() => setIsSaving(false));
  }, [quest, saveSession, startTime]);

  if (!quest || !startTime) return null;

  // Use quest image if available, fallback to first exercise image
  const questImageSource = quest.imagePath
    ? resolveImageAsset(quest.imagePath)
    : quest.exercises[0]
      ? resolveImageAsset(quest.exercises[0].exercise.imagePath)
      : null;

  const handleContinue = () => {
    if (!saveResult) return;

    const campaign = saveResult.campaign;

    quitSession();

    if (campaign?.nextQuestId && campaign.nextRunStepId) {
      router.replace(
        `/(modals)/quest-details/${campaign.nextQuestId}?level=${encodeURIComponent(userLevel)}&runStepId=${campaign.nextRunStepId}` as never
      );
      return;
    }

    if (campaign?.isFinished) {
      router.replace(`/(modals)/adventure-details/${campaign.adventureId}` as never);
      return;
    }

    router.replace("/");
  };

  const handleShare = async () => {
    const xp = saveResult?.xpEarned ?? computeSessionXp({ durationSeconds, userLevel });
    const message = t("session.share_message", {
      quest: questTitle,
      xp,
      defaultValue: `I just completed the '${questTitle}' quest and earned ${xp} XP in Bati! #BatiApp`,
    });

    try {
      await Share.share({ message });
    } catch {
      // Ignore share cancellation/errors.
    }
  };

  return (
    <YStack flex={1} bg="$bgDarker">
      {/* Quest image background with blur */}
      {questImageSource && (
        <YStack fullscreen pointerEvents="none">
          <Image source={questImageSource} style={StyleSheet.absoluteFill} contentFit="cover" />
          <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
          <YStack fullscreen bg="$bgDarker" opacity={0.75} />
        </YStack>
      )}

      {/* Confetti: high z-index to appear on top */}
      <YStack fullscreen pointerEvents="none" zIndex={200}>
        <ConfettiCannon
          count={isBossDefeat ? 400 : 200}
          origin={{ x: width / 2, y: -20 }}
          autoStart={true}
          fadeOut={true}
          explosionSpeed={isBossDefeat ? 500 : 350}
          fallSpeed={isBossDefeat ? 2500 : 3000}
        />
      </YStack>

      {saveResult ? (
        <RewardsManifest
          active={isManifestActive}
          questTitle={questTitle}
          durationSeconds={saveResult.durationSeconds}
          xpEarned={saveResult.xpEarned}
          oldTotalXp={saveResult.oldTotalXp}
          newTotalXp={saveResult.newTotalXp}
          loot={saveResult.loot}
          totalReps={totalReps}
          onContinue={handleContinue}
          onShare={handleShare}
        />
      ) : (
        <YStack flex={1} items="center" justifyContent="center" px="$5" gap="$3">
          <Text
            fontFamily="$heading"
            fontWeight="900"
            letterSpacing={3}
            textTransform="uppercase"
            color="$textSecondary"
          >
            {isSaving ? t("common.saving") : t("session.quest_complete")}
          </Text>
        </YStack>
      )}

      {shouldShowLootReveal ? (
        <LootReveal loot={lootToReveal} onDismiss={() => setHasRevealedLoot(true)} />
      ) : null}
    </YStack>
  );
}
