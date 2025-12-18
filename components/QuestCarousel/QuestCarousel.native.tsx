import { Card } from "@/components/common/Card";
import { Chip } from "@/components/common/Chip";
import { ProgressDots } from "@/components/ProgressDots";
import { listQuestTemplates } from "@/db";
import type { QuestTemplate } from "@/db/quests";
import { useSettingsStore } from "@/stores/settings";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { ScrollView, useWindowDimensions } from "react-native";
import { Paragraph, Text, XStack, YStack } from "tamagui";

type LoadState =
    | { status: "loading"; quests: QuestTemplate[] }
    | { status: "ready"; quests: QuestTemplate[] }
    | { status: "error"; quests: QuestTemplate[]; message: string };

function questEmoji(rounds: number, exerciseCount: number) {
    if (rounds >= 4) return "🧨";
    if (exerciseCount >= 4) return "⚔️";
    return "🪓";
}

export function QuestCarousel() {
    const router = useRouter();
    const { t } = useTranslation();
    const { language } = useSettingsStore();
    const { width } = useWindowDimensions();

    const [state, setState] = useState<LoadState>({ status: "loading", quests: [] });
    const [active, setActive] = useState(1);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const quests = await listQuestTemplates();
                if (!mounted) return;
                setState({ status: "ready", quests });
                setActive(quests.length > 0 ? 1 : 0);
            } catch (e) {
                if (!mounted) return;
                setState({
                    status: "error",
                    quests: [],
                    message: e instanceof Error ? e.message : "Unknown error",
                });
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);

    const quests = state.quests;

    const slideWidth = useMemo(() => Math.min(420, Math.max(280, width - 48)), [width]);
    const sidePad = useMemo(
        () => Math.max(18, Math.floor((width - slideWidth) / 2)),
        [width, slideWidth],
    );

    const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (quests.length === 0) return;
        const x = e.nativeEvent.contentOffset.x;
        const idx = Math.round(x / slideWidth) + 1;
        const clamped = Math.min(Math.max(idx, 1), quests.length);
        if (clamped !== active) setActive(clamped);
    };

    if (state.status === "loading") {
        return (
            <Card>
                <XStack items="center" justify="center" gap="$3" py="$4">
                    <Text fontSize={28}>🗺️</Text>
                    <Text fontWeight="900" fontSize={16} color="$color">
                        {t("quests.loading", "Loading...")}
                    </Text>
                </XStack>
            </Card>
        );
    }

    if (state.status === "error") {
        return (
            <Card>
                <YStack gap="$3" items="center" py="$2">
                    <Text fontSize={32}>😵</Text>
                    <Text fontWeight="900" fontSize={16} color="$color">
                        {t("quests.load_error", "Oops!")}
                    </Text>
                    <Paragraph color="$color" opacity={0.6} size="$3">
                        {state.message}
                    </Paragraph>
                </YStack>
            </Card>
        );
    }

    if (quests.length === 0) {
        return (
            <Card>
                <YStack gap="$3" items="center" py="$2">
                    <Text fontSize={32}>🏚️</Text>
                    <Text fontWeight="900" fontSize={16} color="$color">
                        {t("quests.empty_title", "No quests yet")}
                    </Text>
                    <Paragraph color="$color" opacity={0.6} size="$3">
                        {t("quests.empty_subtitle", "Come back soon!")}
                    </Paragraph>
                </YStack>
            </Card>
        );
    }

    return (
        <YStack gap="$2" width="100%">
            <XStack items="center" justify="space-between" px="$1">
                <Text fontWeight="900" fontSize={16} color="$color">
                    {t("quests.home_overview_title", "Pick a quest")}
                </Text>
                <Text
                    fontWeight="900"
                    fontSize={14}
                    color="$primary"
                    onPress={() => router.push("/quests" as never)}
                >
                    {t("quests.see_all", "See all")} →
                </Text>
            </XStack>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={slideWidth}
                decelerationRate="fast"
                disableIntervalMomentum
                contentContainerStyle={{ paddingHorizontal: sidePad, paddingBottom: 4 }}
                onScroll={onScroll}
                scrollEventThrottle={16}
            >
                {quests.map((q) => {
                    const title = language === "fr" ? q.frTitle : q.enTitle;
                    const desc = language === "fr" ? q.frDescription : q.enDescription;
                    const emoji = questEmoji(q.rounds, q.exercises.length);

                    return (
                        <YStack key={q.id} width={slideWidth} pr={12}>
                            <Card onPress={() => router.push(`/quests/${q.id}` as never)}>
                                <XStack gap="$3" items="flex-start">
                                    <YStack
                                        width={54}
                                        height={54}
                                        rounded={27}
                                        bg="$bgLight"
                                        borderWidth={3}
                                        borderColor="$color"
                                        justify="center"
                                        items="center"
                                    >
                                        <Text fontSize={26}>{emoji}</Text>
                                    </YStack>

                                    <YStack flex={1} gap="$2">
                                        <Text fontWeight="900" fontSize={18} color="$color" numberOfLines={2}>
                                            {title}
                                        </Text>
                                        <Paragraph color="$color" opacity={0.7} size="$3" numberOfLines={2}>
                                            {desc}
                                        </Paragraph>

                                        <XStack gap="$2" flexWrap="wrap" pt="$1">
                                            <Chip
                                                label={t("quests.rounds", {
                                                    count: q.rounds,
                                                    defaultValue: `${q.rounds} rounds`,
                                                })}
                                                tone="secondary"
                                            />
                                            <Chip
                                                label={t("quests.exercises", {
                                                    count: q.exercises.length,
                                                    defaultValue: `${q.exercises.length} exercises`,
                                                })}
                                                tone="primary"
                                            />
                                            <Chip
                                                label={t("quests.rest", {
                                                    count: q.restSeconds,
                                                    defaultValue: `Rest ${q.restSeconds}s`,
                                                })}
                                                tone="warning"
                                            />
                                        </XStack>
                                    </YStack>
                                </XStack>
                            </Card>
                        </YStack>
                    );
                })}
            </ScrollView>

            <ProgressDots current={active} total={quests.length} />
        </YStack>
    );
}
