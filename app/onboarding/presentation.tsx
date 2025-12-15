import { AppButton } from "@/components/common/AppButton";
import { ProgressDots } from "@/components/ProgressDots";
import { Castle, Swords, Trophy } from "@tamagui/lucide-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { H2, Paragraph, XStack, YStack } from "tamagui";

const TOTAL_STEPS = 4;
const CURRENT_STEP = 2;

const FEATURES = [
  { icon: Swords, key: "battle", color: "$secondary" },
  { icon: Trophy, key: "compete", color: "$primary" },
  { icon: Castle, key: "build", color: "$success" },
] as const;

export default function Presentation() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <YStack flex={1} bg="$background">
      <YStack
        width="100%"
        aspectRatio={16 / 11}
        bg="$bgLight"
        borderBottomWidth={4}
        borderColor="$color"
        shadowColor="$color"
        shadowRadius={0}
        shadowOffset={{ width: 0, height: 6 }}
        overflow="hidden"
        animation="lazy"
        enterStyle={{ opacity: 0, y: -20 }}
      >
        <Image
          source={require("../../assets/onboardings/battle.jpg")}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          transition={180}
        />
      </YStack>

      <YStack flex={1} p="$5" justify="space-between" gap="$5">
        <YStack gap="$3" items="center">
          <ProgressDots current={CURRENT_STEP} total={TOTAL_STEPS} />

          <H2
            text="center"
            color="$color"
            fontWeight="900"
            fontSize={26}
            animation="lazy"
            enterStyle={{ opacity: 0, y: 18 }}
          >
            {t("onboarding.presentation_title")}
          </H2>

          <Paragraph
            text="center"
            size="$4"
            color="$color"
            fontWeight="500"
            opacity={0.65}
            maxW={320}
            lineHeight={22}
            animation="lazy"
            enterStyle={{ opacity: 0, y: 14 }}
          >
            {t("onboarding.presentation_description")}
          </Paragraph>

          <XStack gap="$4" justify="center" pt="$2">
            {FEATURES.map((feature, index) => {
              const Icon = feature.icon;

              return (
                <YStack
                  key={feature.key}
                  width={72}
                  height={72}
                  bg="$bgLight"
                  rounded="$8"
                  borderWidth={3}
                  borderColor="$color"
                  justify="center"
                  items="center"
                  animation="bouncy"
                  enterStyle={{ opacity: 0, scale: 0.6, y: 30 }}
                  animateOnly={["opacity", "scale", "transform"]}
                  style={{ animationDelay: `${index * 90}ms` }}
                >
                  <Icon size={34} color={feature.color} strokeWidth={2.5} />
                </YStack>
              );
            })}
          </XStack>
        </YStack>

        <AppButton
          variant="secondary"
          onPress={() => router.push("/onboarding/choose-avatar")}
          marginBottom="$4"
        >
          {t("onboarding.next")} →
        </AppButton>
      </YStack>
    </YStack>
  );
}
