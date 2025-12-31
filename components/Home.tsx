import { Card } from "@/components/common/Card";
import { QuestCarousel } from "@/components/QuestCarousel";
import { getAvatarById } from "@/constants/avatars";
import { useSettingsStore } from "@/stores/settings";
import { useUserStore } from "@/stores/user";
import { Map as MapIcon } from "@tamagui/lucide-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { H1, Paragraph, Text, XStack, YStack } from "tamagui";
import { AppButton } from "./common/AppButton";
import { HomeSettingsMenu } from "./HomeSettingsMenu";

export function Home() {
  const { t } = useTranslation();
  const { villageName } = useUserStore();
  const { avatarId } = useSettingsStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const avatar = getAvatarById(avatarId);

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
              {villageName || t("welcome")} 🏰
            </H1>
            <Paragraph color="$color" opacity={0.6} fontSize={16}>
              {t("onboarding.presentation_description")}
            </Paragraph>
          </YStack>
        </YStack>

        {/* Full-bleed slide gallery */}
        <QuestCarousel />

        <YStack px={24} items="center" gap={16}>
          <YStack width="100%" maxW={420} gap="$4">
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

            {__DEV__ && (
              <AppButton onPress={() => router.push("/dev")} variant="secondary" marginTop="$6">
                🛠️ Dev Tools
              </AppButton>
            )}
          </YStack>
        </YStack>
      </ScrollView>
    </YStack>
  );
}
