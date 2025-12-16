import { Map as MapIcon } from "@tamagui/lucide-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { H1, Paragraph, Text, XStack, YStack } from "tamagui";
import { Card } from "@/components/common/Card";
import { HomeSettingsMenu } from "@/components/HomeSettingsMenu";
import { getAvatarById } from "@/constants/avatars";
import { useSettingsStore } from "@/stores/settings";
import { useUserStore } from "@/stores/user";
import { AppButton } from "./common/AppButton";

export function Home() {
  const { t } = useTranslation();
  const { villageName } = useUserStore();
  const { avatarId } = useSettingsStore();
  const router = useRouter();

  const avatar = getAvatarById(avatarId);

  return (
    <YStack flex={1} bg="$background" justify="center" items="center" p="$6" gap="$4">
      <HomeSettingsMenu />

      <YStack
        width={96}
        height={96}
        rounded={48}
        overflow="hidden"
        borderWidth={4}
        borderColor="$primary"
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

      <H1 color="$color" fontWeight="900" fontSize={32}>
        {villageName || t("welcome")} 🏰
      </H1>
      <Paragraph color="$color" opacity={0.6} fontSize={16}>
        {t("onboarding.presentation_description")}
      </Paragraph>
      <Paragraph fontSize={64}>🏗️</Paragraph>
      <Paragraph color="$color" opacity={0.4} fontSize={14}>
        Coming soon...
      </Paragraph>

      <Card
        width="100%"
        maxW={420}
        bg="$bgLight"
        mt="$4"
        onPress={() => router.push("/quests" as never)}
      >
        <XStack items="center" justify="space-between" gap="$3">
          <YStack flex={1} gap="$1">
            <XStack items="center" gap="$2">
              <MapIcon size={18} color="#1A1A2E" />
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
        <AppButton onPress={() => router.push("/dev")} variant="secondary" marginTop="$8">
          🛠️ Dev Tools
        </AppButton>
      )}
    </YStack>
  );
}
