import { Check } from "@tamagui/lucide-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Button, H2, Paragraph, XStack, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { ProgressDots } from "@/components/ProgressDots";
import { AVATARS } from "@/constants/avatars";
import { useSettingsStore } from "@/stores/settings";

const TOTAL_STEPS = 4;
const CURRENT_STEP = 3;

export default function ChooseAvatar() {
  const router = useRouter();
  const { t } = useTranslation();
  const { avatarId, setAvatarId } = useSettingsStore();

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
          source={require("../../assets/onboardings/new_city.jpg")}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          transition={180}
        />
      </YStack>

      <YStack flex={1} p="$5" justify="space-between" gap="$5">
        <YStack gap="$3">
          <ProgressDots current={CURRENT_STEP} total={TOTAL_STEPS} />

          <YStack gap="$2" items="center">
            <H2
              text="center"
              color="$color"
              fontWeight="900"
              fontSize={26}
              animation="lazy"
              enterStyle={{ opacity: 0, y: 18 }}
            >
              {t("onboarding.avatar_title")}
            </H2>
            <Paragraph text="center" color="$color" opacity={0.65} fontWeight="500">
              {t("onboarding.avatar_subtitle")}
            </Paragraph>
          </YStack>

          <XStack flexWrap="wrap" gap="$3" justify="space-between">
            {AVATARS.map((avatar) => {
              const selected = avatarId === avatar.id;

              return (
                <Button
                  key={avatar.id}
                  unstyled
                  onPress={() => {
                    void setAvatarId(avatar.id);
                    void Haptics.selectionAsync();
                  }}
                  width="48%"
                  bg="$bgLight"
                  borderWidth={3}
                  borderColor={selected ? "$primary" : "$color"}
                  rounded="$8"
                  overflow="hidden"
                  pressStyle={{ scale: 0.98, opacity: 0.92 }}
                  animation="quick"
                >
                  <YStack>
                    <YStack height={120} bg="$bgLight">
                      <Image
                        source={avatar.source}
                        style={{ width: "100%", height: "100%" }}
                        contentFit="cover"
                        transition={180}
                      />

                      {selected ? (
                        <YStack
                          position="absolute"
                          t={10}
                          r={10}
                          width={28}
                          height={28}
                          rounded={14}
                          bg="$primary"
                          justify="center"
                          items="center"
                        >
                          <Check size={16} color="white" strokeWidth={3} />
                        </YStack>
                      ) : null}
                    </YStack>

                    <YStack p="$3" items="center">
                      <Paragraph color="$color" fontWeight="900">
                        {avatar.label}
                      </Paragraph>
                    </YStack>
                  </YStack>
                </Button>
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
    </YStack>
  );
}
