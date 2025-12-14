import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { H1, Paragraph, YStack } from "tamagui";
import { useUserStore } from "@/stores/user";
import { AppButton } from "./common/AppButton";

export function Home() {
  const { t } = useTranslation();
  const { villageName } = useUserStore();
  const router = useRouter();

  return (
    <YStack
      flex={1}
      backgroundColor="$background"
      justifyContent="center"
      alignItems="center"
      padding="$6"
      gap="$4"
    >
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

      {__DEV__ && (
        <AppButton onPress={() => router.push("/dev")} variant="secondary" marginTop="$8">
          🛠️ Dev Tools
        </AppButton>
      )}
    </YStack>
  );
}
