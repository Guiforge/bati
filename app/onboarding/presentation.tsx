import { ArrowRight } from "@tamagui/lucide-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { H1, H2, Paragraph, Text, XStack, YStack } from "tamagui";

import { AppButton } from "@/components/common/AppButton";

export default function Presentation() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <YStack flex={1} bg="$background">
      <Image
        source={require("../../assets/onboardings/building.jpg")}
        style={{ position: "absolute", width: 600, height: "100%", left: -190 }}
        contentFit="cover"
        contentPosition="left"
      />

      <LinearGradient
        colors={["rgba(16, 19, 35, 0.9)", "transparent"]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: "33%" }}
      />
      <LinearGradient
        colors={["transparent", "rgba(16, 19, 35, 0.8)", "#101323"]}
        style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "66%" }}
      />

      <YStack flex={1} justify="space-between" pt={insets.top + 20} pb={insets.bottom + 20} px="$5">
        {/* Logo + Title */}
        <YStack items="center" gap="$3">
          {/* Use Bati branding here (avoid game icons on presentation) */}
          <Image
            source={require("@/assets/app-icon.png")}
            style={{ width: 80, height: 80 }}
            contentFit="contain"
          />
          <H1
            color="$text"
            fontSize={40}
            fontWeight="900"
            letterSpacing={4}
            textShadowColor="rgba(0,0,0,0.5)"
            textShadowOffset={{ width: 2, height: 2 }}
            textShadowRadius={0}
          >
            BATI
          </H1>
        </YStack>

        {/* Copy + CTA */}
        <YStack gap="$5">
          <YStack gap="$2">
            <H2
              color="$text"
              fontSize={32}
              fontWeight="800"
              style={{ textAlign: "center" }}
              lineHeight={38}
            >
              {t("onboarding.presentation_title")}
            </H2>
            <Paragraph
              color="$textSecondary"
              style={{ textAlign: "center" }}
              fontSize={16}
              lineHeight={24}
              px="$2"
            >
              {t("onboarding.presentation_description")}
            </Paragraph>
          </YStack>

          <AppButton
            variant="primary"
            onPress={() => router.push("/onboarding/choose-avatar")}
            rounded="$10"
            borderWidth={0}
          >
            <XStack items="center" gap="$2">
              <Text color="$text" fontWeight="900" fontSize={18}>
                {t("onboarding.next")}
              </Text>

              <ArrowRight size={20} color="$text" strokeWidth={3} />
            </XStack>
          </AppButton>
        </YStack>
      </YStack>
    </YStack>
  );
}
