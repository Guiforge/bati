import { Calendar } from "@tamagui/lucide-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { H2, YStack } from "tamagui";

import { AppButton } from "@/components/common/AppButton";
import { WeeklyCalendar } from "@/components/scheduling/WeeklyCalendar";

export default function ScheduleScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    return (
        <YStack flex={1} bg="$background" pt={insets.top} pb={insets.bottom}>
            <YStack px="$4" py="$4" gap="$4">
                <AppButton icon={Calendar} onPress={() => router.back()} variant="secondary">
                    {t("common.back", "Back")}
                </AppButton>
                <H2>{t("scheduling.title", "Weekly Schedule")}</H2>
                <WeeklyCalendar />
            </YStack>
        </YStack>
    );
}
