import { ChevronLeft, ExternalLink, ScrollText } from "@tamagui/lucide-icons";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView as RNScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Paragraph, Separator, Text, XStack, YStack } from "tamagui";

import { Card } from "@/components/common/Card";

type CreditLinkProps = {
    title: string;
    subtitle?: string;
    url: string;
};

function CreditLink({ title, subtitle, url }: CreditLinkProps) {
    return (
        <Button
            bg="$bgLight"
            borderColor="$color"
            borderWidth={2}
            rounded="$4"
            p="$3"
            height="auto"
            pressStyle={{ scale: 0.98, opacity: 0.9 }}
            onPress={() => Linking.openURL(url)}
        >
            <XStack flex={1} items="center" gap="$3">
                <ExternalLink size={20} color="$color" />
                <YStack flex={1} gap="$1">
                    <Text fontSize="$4" fontWeight="900" color="$color">
                        {title}
                    </Text>
                    {subtitle ? (
                        <Text fontSize="$2" color="$color" opacity={0.7}>
                            {subtitle}
                        </Text>
                    ) : null}
                </YStack>
            </XStack>
        </Button>
    );
}

export default function CreditsScreen() {
    const router = useRouter();
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();

    const openUrl = useCallback(async (url: string) => {
        try {
            const supported = await Linking.canOpenURL(url);
            if (!supported) return;
            await Linking.openURL(url);
        } catch {
            // Ignore: opening links can fail on simulators / restricted environments.
        }
    }, []);

    return (
        <YStack flex={1} bg="$background" pt={insets.top}>
            {/* Header */}
            <XStack px="$4" py="$3" items="center" gap="$3">
                <Button
                    size="$3"
                    circular
                    chromeless
                    onPress={() => router.back()}
                    icon={<ChevronLeft size={24} color="$color" />}
                />
                <XStack flex={1} items="center" gap="$2">
                    <ScrollText size={20} color="$color" />
                    <Text fontSize="$6" fontWeight="900" color="$color">
                        {t("credits.title", "Credits")}
                    </Text>
                </XStack>
            </XStack>

            <RNScrollView
                contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 16 }}
            >
                <Card bg="$bgLight" p="$4" gap="$3">
                    <Text fontSize="$4" fontWeight="900" color="$color">
                        {t("credits.third_party_title", "Third-party assets")}
                    </Text>
                    <Paragraph color="$color" opacity={0.8}>
                        {t(
                            "credits.third_party_body",
                            "Bati uses third-party assets and open-source software. Huge thanks to the creators!",
                        )}
                    </Paragraph>
                </Card>

                <Card bg="$bgLight" p="$4" gap="$3">
                    <Text fontSize="$4" fontWeight="900" color="$color">
                        {t("credits.icons_title", "Icons")}
                    </Text>
                    <Paragraph color="$color" opacity={0.8}>
                        {t(
                            "credits.game_icons_note",
                            "Some in-app icons are from game-icons.net (e.g. the RPG-style SVG icons in our assets folder). They are licensed under CC BY 3.0 by their respective authors (Lorc, Delapouite, and contributors).",
                        )}
                    </Paragraph>

                    <Separator />

                    <CreditLink
                        title={t("credits.game_icons_site", "Game-icons.net")}
                        subtitle={t("credits.game_icons_site_subtitle", "Icon library and authors list")}
                        url="https://game-icons.net/"
                    />
                    <CreditLink
                        title={t("credits.game_icons_about", "Attribution guidance")}
                        subtitle={t(
                            "credits.game_icons_about_subtitle",
                            "Suggested credit text and project info",
                        )}
                        url="https://game-icons.net/about.html"
                    />
                    <CreditLink
                        title={t("credits.cc_by_30", "Creative Commons BY 3.0")}
                        subtitle={t("credits.cc_by_30_subtitle", "License terms")}
                        url="https://creativecommons.org/licenses/by/3.0/"
                    />

                    <Separator />

                    <Paragraph color="$color" opacity={0.8}>
                        {t(
                            "credits.attribution_example",
                            'Example attribution (from game-icons.net): "Icons made by {author}. Available on https://game-icons.net".',
                        )}
                    </Paragraph>
                    <Button
                        bg="$secondary"
                        borderColor="$color"
                        borderWidth={3}
                        rounded="$6"
                        pressStyle={{ opacity: 0.9, scale: 0.98 }}
                        onPress={() => openUrl("https://game-icons.net/about.html#authors")}
                        style={{ alignSelf: "flex-start" }}
                    >
                        <Button.Text color="white" fontWeight="900">
                            {t("credits.view_authors", "View authors")}
                        </Button.Text>
                    </Button>
                </Card>

                <Card bg="$bgLight" p="$4" gap="$3">
                    <Text fontSize="$4" fontWeight="900" color="$color">
                        {t("credits.open_source_title", "Open-source software")}
                    </Text>
                    <Paragraph color="$color" opacity={0.8}>
                        {t(
                            "credits.open_source_body",
                            "Built with Expo + React Native, Tamagui, Zustand, Drizzle ORM, i18next, and more.",
                        )}
                    </Paragraph>

                    <Separator />

                    <CreditLink title="Expo" subtitle="https://expo.dev" url="https://expo.dev" />
                    <CreditLink
                        title="React Native"
                        subtitle="https://reactnative.dev"
                        url="https://reactnative.dev"
                    />
                    <CreditLink title="Tamagui" subtitle="https://tamagui.dev" url="https://tamagui.dev" />
                    <CreditLink
                        title="Zustand"
                        subtitle="https://zustand-demo.pmnd.rs"
                        url="https://zustand-demo.pmnd.rs"
                    />
                    <CreditLink
                        title="Drizzle ORM"
                        subtitle="https://orm.drizzle.team"
                        url="https://orm.drizzle.team"
                    />
                </Card>
            </RNScrollView>
        </YStack>
    );
}
