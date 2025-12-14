import { AppButton } from "@/components/common/AppButton";
import { ProgressDots } from "@/components/ProgressDots";
import { Castle, Swords, Trophy } from "@tamagui/lucide-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { H2, Paragraph, XStack, YStack } from "tamagui";

const TOTAL_STEPS = 3;
const CURRENT_STEP = 2;

const FEATURES = [
  { icon: Swords, key: "battle", color: "$secondary" },
  { icon: Trophy, key: "compete", color: "$primary" },
  { icon: Castle, key: "build", color: "$success" },
];

export default function Presentation() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <YStack flex={1} padding="$5" backgroundColor="$background">
      <ProgressDots current={CURRENT_STEP} total={TOTAL_STEPS} />

      <YStack flex={1} justifyContent="center" alignItems="center" gap="$6">
        <YStack
          width="100%"
          aspectRatio={4 / 3}
          maxHeight={260}
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
          enterStyle={{ opacity: 0, scale: 0.9, y: -20 }}
        >
          <Image
            source={require("../../assets/onboardings/battle.jpg")}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
          />
        </YStack>

        <YStack gap="$4" alignItems="center">
          <H2
            textAlign="center"
            color="$color"
            fontWeight="900"
            fontSize={26}
            animation="lazy"
            enterStyle={{ opacity: 0, y: 20 }}
          >
            {t("onboarding.presentation_title")}
          </H2>

          <Paragraph
            textAlign="center"
            size="$4"
            color="$color"
            fontWeight="500"
            opacity={0.6}
            maxWidth={280}
            lineHeight={22}
            animation="lazy"
            enterStyle={{ opacity: 0, y: 15 }}
          >
            {t("onboarding.presentation_description")}
          </Paragraph>
        </YStack>

        <XStack gap="$5" justifyContent="center">
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <YStack
                key={feature.key}
                width={80}
                height={80}
                backgroundColor="$bgLight"
                borderRadius="$8"
                borderWidth={3}
                borderColor="$color"
                justifyContent="center"
                alignItems="center"
                animation="bouncy"
                enterStyle={{ opacity: 0, scale: 0.5, y: 40 }}
                animateOnly={["opacity", "scale", "transform"]}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <Icon size={36} color={feature.color} strokeWidth={2.5} />
              </YStack>
            );
          })}
        </XStack>
      </YStack>

      <AppButton
        variant="secondary"
        onPress={() => router.push("/onboarding/village-name")}
        marginBottom="$4"
      >
        {t("onboarding.next")} →
      </AppButton>
    </YStack>
  );
}
