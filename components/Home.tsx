import { Map as MapIcon, Sparkles } from "@tamagui/lucide-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { H1, Paragraph, Text, XStack, YStack } from "tamagui";

import { Card } from "@/components/common/Card";
import { StreakBadge } from "@/components/common/StreakBadge";
import { QuestCarousel } from "@/components/QuestCarousel";
import { getAvatarById } from "@/constants/avatars";
import type { ActiveAdventureRun, AdventureDetails } from "@/db";
import { getAdventureDetails, getAnyActiveAdventureRun } from "@/db";
import { useSettingsStore } from "@/stores/settings";
import { useUserStore } from "@/stores/user";
import { AppButton } from "./common/AppButton";
import { HomeSettingsMenu } from "./HomeSettingsMenu";

type ActiveAdventureMeta = {
  adventureId: number;
  details: AdventureDetails;
  activeRun: ActiveAdventureRun;
};

export function Home() {
  const { t } = useTranslation();
  const { villageName } = useUserStore();
  const { avatarId, language } = useSettingsStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const avatar = getAvatarById(avatarId);

  const [activeAdventure, setActiveAdventure] = useState<ActiveAdventureMeta | null>(null);

  const loadActiveAdventure = useCallback(async () => {
    try {
      const any = await getAnyActiveAdventureRun();
      if (!any) {
        setActiveAdventure(null);
        return;
      }

      const details = await getAdventureDetails(any.adventureId);
      if (!details) {
        setActiveAdventure(null);
        return;
      }

      setActiveAdventure({ adventureId: any.adventureId, details, activeRun: any.activeRun });
    } catch {
      // Home should stay resilient; silently ignore.
      setActiveAdventure(null);
    }
  }, []);

  useEffect(() => {
    void loadActiveAdventure();
  }, [loadActiveAdventure]);

  const activeAdventureTitle = useMemo(() => {
    if (!activeAdventure) return null;
    const { details } = activeAdventure;
    return language === "fr" ? details.adventure.frTitle : details.adventure.enTitle;
  }, [activeAdventure, language]);

  const activeStepIndex = useMemo(() => {
    const idx = activeAdventure?.activeRun.activeStep?.stepIndex;
    return typeof idx === "number" ? idx : null;
  }, [activeAdventure]);

  return (
    <YStack flex={1} bg="$background">
      <HomeSettingsMenu />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
          // Keep the carousel full-bleed; apply horizontal padding in inner wrappers.
          alignItems: "stretch",
          gap: 16,
        }}
      >
        <YStack px={24} items="center" gap={16}>
          <YStack
            width={96}
            height={96}
            rounded={48}
            overflow="hidden"
            borderWidth={3}
            borderColor="$color"
            bg="$bgLight"
            shadowColor="$color"
            shadowRadius={0}
            shadowOffset={{ width: 0, height: 6 }}
          >
            <Image
              source={avatar.source}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              transition={160}
            />
          </YStack>

          <YStack items="center" gap="$2">
            <H1 color="$color" fontWeight="900" fontSize={32}>
              {villageName || t("welcome")}
            </H1>
            <Paragraph color="$color" opacity={0.6} fontSize={16}>
              {t("onboarding.presentation_description")}
            </Paragraph>
          </YStack>

          {/* Streak Badge */}
          <StreakBadge />
        </YStack>

        {activeAdventure ? (
          <YStack px={24} items="center">
            <Card
              bg="$pastelGreen"
              width="100%"
              maxW={420}
              onPress={() => router.push(`/adventures/${activeAdventure.adventureId}` as never)}
            >
              <YStack gap="$2">
                <Text fontWeight="900" fontSize={16} color="$color">
                  {t("home_continue_adventure_title", "Continue your adventure")}
                </Text>
                <Paragraph color="$color" opacity={0.7} size="$3" numberOfLines={2}>
                  {activeAdventureTitle || t("adventures.details_title", "Adventure")}
                </Paragraph>
                <Paragraph color="$color" opacity={0.6} size="$3">
                  {activeStepIndex != null
                    ? t("adventures.step_label", {
                        count: activeStepIndex + 1,
                        defaultValue: `Step ${activeStepIndex + 1}`,
                      })
                    : t("home_continue_adventure_subtitle", "Pick up where you left off.")}
                </Paragraph>
                <AppButton
                  fullWidth={false}
                  variant="secondary"
                  onPress={() => router.push(`/adventures/${activeAdventure.adventureId}` as never)}
                  height={44}
                  px="$3"
                  fontSize={14}
                >
                  {t("adventures.continue", "Continue")} →
                </AppButton>
              </YStack>
            </Card>
          </YStack>
        ) : null}

        {/* Full-bleed slide gallery */}
        <QuestCarousel />

        <YStack px={24} items="center" gap={16}>
          <YStack width="100%" maxW={420} gap="$4">
            <XStack items="center" justify="space-between">
              <Text fontWeight="900" fontSize={14} color="$color" opacity={0.8}>
                {t("adventures.home_cta_title", "Adventures")}
              </Text>
              <Text
                fontWeight="900"
                fontSize={14}
                color="$primary"
                onPress={() => router.push("/adventures" as never)}
              >
                {t("quests.see_all", "See all")} →
              </Text>
            </XStack>

            <Card bg="$pastelPurple" onPress={() => router.push("/adventures" as never)}>
              <XStack items="center" justify="space-between" gap="$3">
                <YStack flex={1} gap="$1">
                  <XStack items="center" gap="$2">
                    <Sparkles size={18} color="$color" />
                    <Text fontWeight="900" fontSize={16} color="$color">
                      {t("adventures.home_cta_title", "Adventures")}
                    </Text>
                  </XStack>
                  <Paragraph color="$color" opacity={0.7} size="$3">
                    {t("adventures.home_cta_subtitle", "Choose your next adventure.")}
                  </Paragraph>
                </YStack>

                <AppButton
                  fullWidth={false}
                  variant="secondary"
                  onPress={() => router.push("/adventures" as never)}
                  height={44}
                  px="$3"
                  fontSize={14}
                >
                  {t("adventures.home_cta_button", "Open")} →
                </AppButton>
              </XStack>
            </Card>

            <Card bg="$pastelYellow" onPress={() => router.push("/quests" as never)}>
              <XStack items="center" justify="space-between" gap="$3">
                <YStack flex={1} gap="$1">
                  <XStack items="center" gap="$2">
                    <MapIcon size={18} color="$color" />
                    <Text fontWeight="900" fontSize={16} color="$color">
                      {t("quests.home_cta_title")}
                    </Text>
                  </XStack>
                  <Paragraph color="$color" opacity={0.7} size="$3">
                    {t("quests.home_cta_subtitle")}
                  </Paragraph>
                </YStack>

                <AppButton
                  fullWidth={false}
                  variant="secondary"
                  onPress={() => router.push("/quests" as never)}
                  height={44}
                  px="$3"
                  fontSize={14}
                >
                  {t("quests.home_cta_button")} →
                </AppButton>
              </XStack>
            </Card>
          </YStack>
        </YStack>
      </ScrollView>
    </YStack>
  );
}
