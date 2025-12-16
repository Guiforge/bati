import { ChevronLeft, Dumbbell } from "@tamagui/lucide-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ImageSourcePropType } from "react-native";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { H2, Paragraph, Text, XStack, YStack } from "tamagui";
import { AppButton, AppIconButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { Chip } from "@/components/common/Chip";
import { getExerciseById } from "@/db";
import { EQUIPMENT_LABELS } from "@/db/equipment";
import { MUSCLE_LABELS } from "@/db/muscles";
import { useSettingsStore } from "@/stores/settings";

type LoadState =
  | { status: "loading"; ex: null }
  | { status: "ready"; ex: NonNullable<Awaited<ReturnType<typeof getExerciseById>>> }
  | { status: "error"; ex: null; message: string };

function resolveAsset(path?: string | null): ImageSourcePropType | { uri: string } | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return { uri: path };
  if (path === "assets/placeholder.jpg") return require("../../assets/placeholder.jpg");
  return null;
}

export default function ExerciseDetails() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const { t } = useTranslation();
  const { language } = useSettingsStore();

  const exerciseId = useMemo(() => {
    const raw = params.id;
    const v = Array.isArray(raw) ? raw[0] : raw;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }, [params]);

  const [state, setState] = useState<LoadState>({ status: "loading", ex: null });

  const load = useCallback(
    async (id: number) => {
      setState({ status: "loading", ex: null });
      try {
        const ex = await getExerciseById(id);
        if (!ex) {
          setState({
            status: "error",
            ex: null,
            message: t("exercises.not_found", "Exercise not found"),
          });
          return;
        }
        setState({ status: "ready", ex });
      } catch (e) {
        const message = e instanceof Error ? e.message : "Unknown error";
        setState({ status: "error", ex: null, message });
      }
    },
    [t],
  );

  useEffect(() => {
    if (!exerciseId) return;
    void load(exerciseId);
  }, [exerciseId, load]);

  if (!exerciseId) {
    return (
      <YStack flex={1} bg="$background" justify="center" items="center" p="$6" gap="$3">
        <Text fontWeight="900" fontSize={18} color="$color">
          {t("exercises.invalid_id", "Invalid exercise")}
        </Text>
        <AppButton fullWidth={false} variant="secondary" onPress={() => router.back()}>
          {t("exercises.go_back", "Go back")}
        </AppButton>
      </YStack>
    );
  }

  return (
    <YStack flex={1} bg="$background">
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}>
        <YStack p="$5" pt={insets.top + 12} gap="$4">
          <XStack items="center" justify="space-between">
            <XStack items="center" gap="$3">
              <AppIconButton onPress={() => router.back()}>
                <ChevronLeft size={22} color="#1A1A2E" strokeWidth={2.5} />
              </AppIconButton>

              <XStack items="center" gap="$2">
                <Dumbbell size={18} color="#1A1A2E" strokeWidth={2.5} />
                <Text fontWeight="900" fontSize={20} color="$color">
                  {t("exercises.details_title", "Exercise")}
                </Text>
              </XStack>
            </XStack>
          </XStack>

          {state.status === "error" ? (
            <Card bg="$bgLight">
              <YStack gap="$2">
                <Text fontWeight="900" fontSize={16} color="$color">
                  {t("exercises.load_error", "Failed to load exercise")}
                </Text>
                <Paragraph color="$color" opacity={0.7} size="$3">
                  {state.message}
                </Paragraph>
                <AppButton
                  fullWidth={false}
                  variant="secondary"
                  onPress={() => void load(exerciseId)}
                >
                  {t("exercises.retry", "Retry")} ↻
                </AppButton>
              </YStack>
            </Card>
          ) : null}

          {state.status === "loading" ? (
            <Card bg="$bgLight">
              <XStack items="center" justify="space-between">
                <Text fontWeight="900" fontSize={16} color="$color">
                  {t("exercises.loading", "Loading...")}
                </Text>
                <Text fontSize={24}>🧠</Text>
              </XStack>
            </Card>
          ) : null}

          {state.status === "ready"
            ? (() => {
                const ex = state.ex;
                const title = language === "fr" ? ex.frName : ex.enName;
                const desc = language === "fr" ? ex.frDescription : ex.enDescription;
                const img = resolveAsset(ex.imagePath) ?? resolveAsset("assets/placeholder.jpg");

                return (
                  <YStack gap="$4">
                    <YStack
                      width="100%"
                      aspectRatio={16 / 9}
                      bg="$bgLight"
                      borderWidth={3}
                      borderColor="$color"
                      rounded="$8"
                      shadowColor="$color"
                      shadowRadius={0}
                      shadowOffset={{ width: 0, height: 6 }}
                      overflow="hidden"
                    >
                      {img ? (
                        <Image
                          source={img}
                          style={{ width: "100%", height: "100%" }}
                          contentFit="cover"
                          transition={0}
                        />
                      ) : null}
                    </YStack>

                    <Card>
                      <YStack gap="$2">
                        <H2 color="$color" fontWeight="900" fontSize={26}>
                          {title}
                        </H2>
                        <Paragraph color="$color" opacity={0.7} size="$4" lineHeight={22}>
                          {desc}
                        </Paragraph>

                        <XStack gap="$2" flexWrap="wrap" pt="$2">
                          <Chip
                            label={EQUIPMENT_LABELS[ex.equipment]?.[language] ?? ex.equipment}
                            tone={ex.equipment === "none" ? "default" : "secondary"}
                          />
                          <Chip
                            label={t("exercises.seconds_per_rep", {
                              count: ex.secondsPerRep,
                              defaultValue: `${ex.secondsPerRep}s/rep`,
                            })}
                            tone="secondary"
                          />
                          {ex.muscles.map((m) => (
                            <Chip key={m} label={MUSCLE_LABELS[m]?.[language] ?? m} />
                          ))}
                        </XStack>
                      </YStack>
                    </Card>
                  </YStack>
                );
              })()
            : null}
        </YStack>
      </ScrollView>
    </YStack>
  );
}
