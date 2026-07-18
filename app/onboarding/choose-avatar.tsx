import { ChevronLeft, ChevronRight } from "@tamagui/lucide-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { H2, Paragraph, Text, XStack, YStack } from "tamagui";

import { AppButton } from "@/components/common/AppButton";
import { ProgressDots } from "@/components/ProgressDots";
import { AVATARS, getAvatarById } from "@/constants/avatars";
import { useHaptics } from "@/hooks/useHaptics";
import { useSettingsStore } from "@/stores/settings";

const TOTAL_STEPS = 3;
const CURRENT_STEP = 2;
const SWIPE_THRESHOLD = 50;

export default function ChooseAvatar() {
  const router = useRouter();
  const { t } = useTranslation();
  const { avatarId, setAvatarId } = useSettingsStore();
  const { selection } = useHaptics();
  const insets = useSafeAreaInsets();

  const currentIndex = AVATARS.findIndex((a) => a.id === avatarId);
  const currentAvatar = getAvatarById(avatarId);

  const goToPrev = useCallback(() => {
    const prevIndex = currentIndex <= 0 ? AVATARS.length - 1 : currentIndex - 1;
    setAvatarId(AVATARS[prevIndex].id).catch(() => {
      // Error handled silently
    });
    selection();
  }, [currentIndex, setAvatarId, selection]);

  const goToNext = useCallback(() => {
    const nextIndex = currentIndex >= AVATARS.length - 1 ? 0 : currentIndex + 1;
    setAvatarId(AVATARS[nextIndex].id).catch(() => {
      // Error handled silently
    });
    selection();
  }, [currentIndex, setAvatarId, selection]);

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .runOnJS(true)
    .onEnd((event) => {
      if (event.translationX > SWIPE_THRESHOLD) {
        goToPrev();
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        goToNext();
      }
    });

  return (
    <GestureDetector gesture={swipeGesture}>
      <YStack flex={1} bg="$background" collapsable={false}>
        {/* Full-screen avatar as background */}
        <Image
          source={currentAvatar.source}
          style={{ position: "absolute", width: "100%", height: "100%" }}
          contentFit="cover"
          contentPosition="top"
          transition={200}
        />

        {/* Gradient overlays */}
        <LinearGradient
          colors={["rgba(16, 19, 35, 0.85)", "transparent"]}
          style={{ position: "absolute", top: 0, left: 0, right: 0, height: "30%" }}
        />
        <LinearGradient
          colors={["transparent", "rgba(16, 19, 35, 0.9)", "#101323"]}
          style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "50%" }}
        />

        {/* Content */}
        <YStack
          flex={1}
          justify="space-between"
          pt={insets.top + 20}
          pb={insets.bottom + 20}
          px="$5"
        >
          {/* Header */}
          <YStack gap="$3" items="center">
            <ProgressDots current={CURRENT_STEP} total={TOTAL_STEPS} />
            <YStack gap="$2" items="center">
              <H2
                text="center"
                color="$text"
                fontWeight="900"
                fontSize={28}
                textShadowColor="rgba(0,0,0,0.5)"
                textShadowOffset={{ width: 1, height: 1 }}
                textShadowRadius={4}
              >
                {t("onboarding.avatar_title")}
              </H2>
              <Paragraph
                text="center"
                color="$textSecondary"
                fontWeight="500"
                textShadowColor="rgba(0,0,0,0.5)"
                textShadowOffset={{ width: 1, height: 1 }}
                textShadowRadius={4}
              >
                {t("onboarding.avatar_subtitle")}
              </Paragraph>
            </YStack>
          </YStack>

          {/* Bottom section */}
          <YStack gap="$5">
            {/* Avatar selector */}
            <XStack items="center" justify="center" gap="$4">
              <AppButton
                unstyled
                onPress={goToPrev}
                width={48}
                height={48}
                rounded={24}
                bg="$surface"
                borderWidth={1}
                borderColor="$borderStrong"
                justify="center"
                items="center"
                pressStyle={{ opacity: 0.7, scale: 0.95 }}
              >
                <ChevronLeft size={28} color="$text" strokeWidth={2.5} />
              </AppButton>

              <YStack items="center" gap="$2" width={140}>
                <Text
                  color="$text"
                  fontSize={22}
                  fontWeight="900"
                  textShadowColor="rgba(0,0,0,0.5)"
                  textShadowOffset={{ width: 1, height: 1 }}
                  textShadowRadius={4}
                >
                  {t(currentAvatar.labelKey)}
                </Text>
                <Text color="$textSecondary" fontSize={14}>
                  {currentIndex + 1} / {AVATARS.length}
                </Text>
              </YStack>

              <AppButton
                unstyled
                onPress={goToNext}
                width={48}
                height={48}
                rounded={24}
                bg="$surface"
                borderWidth={1}
                borderColor="$borderStrong"
                justify="center"
                items="center"
                pressStyle={{ opacity: 0.7, scale: 0.95 }}
              >
                <ChevronRight size={28} color="$text" strokeWidth={2.5} />
              </AppButton>
            </XStack>

            {/* CTA Button */}
            <AppButton
              variant="secondary"
              onPress={() => router.push("/onboarding/village-name")}
              rounded="$10"
              borderWidth={0}
              bg="$secondary"
            >
              <XStack items="center" gap="$2">
                <Text color="$bgDark" fontWeight="900" fontSize={18}>
                  {t("onboarding.next_avatar")}
                </Text>
              </XStack>
            </AppButton>
          </YStack>
        </YStack>
      </YStack>
    </GestureDetector>
  );
}
