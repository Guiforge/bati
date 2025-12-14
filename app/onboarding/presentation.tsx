import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Button, H2, Paragraph, XStack, YStack } from "tamagui";
import { ProgressDots } from "@/components/ProgressDots";

const TOTAL_STEPS = 3;
const CURRENT_STEP = 2;

const FEATURES = [
  { emoji: "⚔️", key: "battle" },
  { emoji: "🏆", key: "compete" },
  { emoji: "🏰", key: "build" },
];

export default function Presentation() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <YStack flex={1} padding="$5" backgroundColor="$background">
      <ProgressDots current={CURRENT_STEP} total={TOTAL_STEPS} />

      <YStack flex={1} justifyContent="center" alignItems="center" gap="$5">
        <YStack
          width="100%"
          aspectRatio={4 / 3}
          maxHeight={280}
          backgroundColor="$bgLight"
          borderRadius="$10"
          justifyContent="center"
          alignItems="center"
          borderWidth={4}
          borderColor="$color"
          shadowColor="$color"
          shadowRadius={0}
          shadowOffset={{ width: 6, height: 6 }}
          overflow="hidden"
          animation="lazy"
          enterStyle={{ opacity: 0, scale: 0.8, rotate: "3deg" }}
        >
          <Image
            source={require("../../assets/onboardings/battle.jpg")}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
          />
        </YStack>

        <YStack gap="$3" alignItems="center">
          <H2
            textAlign="center"
            color="$color"
            fontWeight="900"
            fontSize={28}
            animation="lazy"
            enterStyle={{ opacity: 0, y: 20 }}
          >
            {t("onboarding.presentation_title")} 🎮
          </H2>

          <Paragraph
            textAlign="center"
            size="$5"
            color="$color"
            fontWeight="500"
            opacity={0.7}
            maxWidth={300}
            animation="lazy"
            enterStyle={{ opacity: 0, y: 15 }}
          >
            {t("onboarding.presentation_description")}
          </Paragraph>
        </YStack>

        <XStack gap="$4" justifyContent="center" paddingTop="$2">
          {FEATURES.map((feature) => (
            <YStack
              key={feature.key}
              width={70}
              height={70}
              backgroundColor="$bgLight"
              borderRadius="$6"
              borderWidth={3}
              borderColor="$color"
              justifyContent="center"
              alignItems="center"
              animation="bouncy"
              enterStyle={{ opacity: 0, scale: 0.5, y: 30 }}
              animateOnly={["opacity", "scale", "transform"]}
            >
              <Paragraph fontSize={32}>{feature.emoji}</Paragraph>
            </YStack>
          ))}
        </XStack>
      </YStack>

      <Button
        onPress={() => router.push("/onboarding/village-name")}
        size="$6"
        width="100%"
        backgroundColor="$secondary"
        borderColor="$color"
        borderWidth={3}
        borderRadius="$8"
        color="white"
        fontWeight="900"
        fontSize={20}
        shadowColor="$color"
        shadowRadius={0}
        shadowOffset={{ width: 4, height: 4 }}
        pressStyle={{ x: 4, y: 4, shadowOffset: { width: 0, height: 0 } }}
        animation="quick"
        marginBottom="$4"
      >
        {t("onboarding.next")} →
      </Button>
    </YStack>
  );
}
