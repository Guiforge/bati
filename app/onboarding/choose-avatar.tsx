import { AppButton } from "@/components/common/AppButton";
import { ProgressDots } from "@/components/ProgressDots";
import { AVATARS, getAvatarById } from "@/constants/avatars";
import { useSettingsStore } from "@/stores/settings";
import { Check } from "@tamagui/lucide-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { H2, Paragraph, XStack, YStack } from "tamagui";

const TOTAL_STEPS = 4;
const CURRENT_STEP = 3;

export default function ChooseAvatar() {
    const router = useRouter();
    const { t } = useTranslation();
    const { avatarId, setAvatarId } = useSettingsStore();
    const insets = useSafeAreaInsets();

    return (
        <YStack flex={1} bg="$background">
            <ScrollView
                contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 16 }}
                keyboardShouldPersistTaps="handled"
            >
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
                >
                    <Image
                        source={getAvatarById(avatarId).source}
                        style={{ width: "100%", height: "100%" }}
                        contentFit="cover"
                        transition={0}
                    />
                </YStack>

                <YStack flex={1} p="$5" justify="space-between" gap="$5" style={{ flexGrow: 1 }}>
                    <YStack gap="$3">
                        <ProgressDots current={CURRENT_STEP} total={TOTAL_STEPS} />

                        <YStack gap="$2" items="center">
                            <H2 text="center" color="$color" fontWeight="900" fontSize={26}>
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
                                    <AppButton
                                        key={avatar.id}
                                        unstyled
                                        onPress={() => {
                                            void setAvatarId(avatar.id);
                                            void Haptics.selectionAsync();
                                        }}
                                        fullWidth={false}
                                        width="48%"
                                        bg="$bgLight"
                                        borderWidth={3}
                                        borderColor={selected ? "$primary" : "$color"}
                                        rounded="$8"
                                        overflow="hidden"
                                        p={0}
                                        pressStyle={{ opacity: 0.92 }}
                                    >
                                        <YStack>
                                            <YStack height={120} bg="$bgLight">
                                                <Image
                                                    source={avatar.source}
                                                    style={{ width: "100%", height: "100%" }}
                                                    contentFit="cover"
                                                    transition={0}
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
                                    </AppButton>
                                );
                            })}
                        </XStack>
                    </YStack>

                    <AppButton
                        variant="secondary"
                        onPress={() => router.push("/onboarding/village-name")}
                        mb="$4"
                    >
                        {t("onboarding.next")} →
                    </AppButton>
                </YStack>
            </ScrollView>
        </YStack>
    );
}
