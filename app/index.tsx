import { SpriteAnimation } from "@/components/SpriteAnimation";
import { useUserStore } from "@/stores/user";
import { useTranslation } from "react-i18next";
import { H1, Paragraph, YStack } from "tamagui";

export default function Home() {
  const { t } = useTranslation();
  const { villageName } = useUserStore();

  return (
    <YStack
      flex={1}
      alignItems="center"
      justifyContent="center"
      padding="$5"
      backgroundColor="$background"
      gap="$6"
    >
      <YStack
        padding="$4"
        backgroundColor="$bgLight"
        borderRadius={16}
        borderWidth={4}
        borderColor="$color"
        shadowColor="$color"
        shadowRadius={0}
        shadowOffset={{ width: 5, height: 5 }}
      >
        <SpriteAnimation
          source={require("../assets/Characters/Human/IDLE/base_idle_strip9.png")}
          frameCount={9}
          frameWidth={96}
          frameHeight={64}
          fps={15}
          scale={3}
        />
      </YStack>

      <YStack alignItems="center" gap="$2">
        <H1 color="$color" fontWeight="900" fontSize={36} textAlign="center">
          {t("welcome")} 👋
        </H1>

        {villageName ? (
          <Paragraph color="$primary" fontWeight="700" fontSize={24}>
            🏰 {villageName}
          </Paragraph>
        ) : null}

        <Paragraph color="$color" opacity={0.6} fontSize={16} textAlign="center" maxWidth={300}>
          Train, battle & build your empire!
        </Paragraph>
      </YStack>
    </YStack>
  );
}
