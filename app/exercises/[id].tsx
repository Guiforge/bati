import { ChevronLeft, Dumbbell, Timer } from "@tamagui/lucide-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ImageSourcePropType } from "react-native";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Paragraph, Text, XStack, YStack } from "tamagui";
import { AppButton, AppIconButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { Tag } from "@/components/common/Tag";
import { getExerciseById } from "@/db";
import { EQUIPMENT_LABELS } from "@/db/equipment";
import { MUSCLE_LABELS } from "@/db/muscles";
import { useSettingsStore } from "@/stores/settings";

type Exercise = NonNullable<Awaited<ReturnType<typeof getExerciseById>>>;
type Status = "loading" | "ready" | "error";

const PLACEHOLDER = require("../../assets/placeholder.jpg");

const resolveAsset = (path?: string | null): ImageSourcePropType =>
  path === "assets/placeholder.jpg" ? PLACEHOLDER : PLACEHOLDER;

const parseId = (raw?: string | string[]): number | null => {
  const val = Array.isArray(raw) ? raw[0] : raw;
  const num = Number(val);
  return Number.isFinite(num) ? num : null;
};

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

function Header({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <XStack items="center" gap="$3">
      <AppIconButton onPress={onBack}>
        <ChevronLeft size={22} color="$color" strokeWidth={2.5} />
      </AppIconButton>
      <XStack items="center" gap="$2">
        <Dumbbell size={18} color="$color" strokeWidth={2.5} />
        <Text fontWeight="900" fontSize={20} color="$color">
          {title}
        </Text>
      </XStack>
    </XStack>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <Card>
      <YStack gap="$3" items="center" py="$2">
        <Text fontSize={32}>😵</Text>
        <Text fontWeight="900" fontSize={16} color="$color">
          {t("exercises.load_error", "Oops!")}
        </Text>
        <Paragraph color="$color" opacity={0.6} size="$3">
          {message}
        </Paragraph>
        <AppButton fullWidth={false} variant="secondary" onPress={onRetry}>
          {t("exercises.retry", "Retry")} ↻
        </AppButton>
      </YStack>
    </Card>
  );
}

function LoadingCard() {
  const { t } = useTranslation();
  return (
    <Card>
      <XStack items="center" justify="center" gap="$3" py="$4">
        <Text fontSize={28}>💪</Text>
        <Text fontWeight="900" fontSize={16} color="$color">
          {t("exercises.loading", "Loading...")}
        </Text>
      </XStack>
    </Card>
  );
}

function ExerciseImage({ source }: { source: ImageSourcePropType }) {
  return (
    <YStack
      width="100%"
      aspectRatio={16 / 9}
      bg="$bgLight"
      borderWidth={3}
      borderColor="$color"
      rounded="$8"
      shadowColor="$color"
      shadowRadius={0}
      shadowOffset={{ width: 0, height: 5 }}
      overflow="hidden"
    >
      <Image
        source={source}
        style={{ width: "100%", height: "100%" }}
        contentFit="cover"
        transition={200}
      />
    </YStack>
  );
}

function ExerciseContent({ exercise }: { exercise: Exercise }) {
  const { language } = useSettingsStore();
  const { t } = useTranslation();

  const title = language === "fr" ? exercise.frName : exercise.enName;
  const desc = language === "fr" ? exercise.frDescription : exercise.enDescription;
  const equipmentLabel = EQUIPMENT_LABELS[exercise.equipment]?.[language] ?? exercise.equipment;
  const img = resolveAsset(exercise.imagePath);

  return (
    <YStack gap="$4">
      <ExerciseImage source={img} />

      <Card>
        <YStack gap="$3">
          {/* Title */}
          <Text color="$color" fontWeight="900" fontSize={24} lineHeight={28}>
            {title}
          </Text>

          {/* Description */}
          {desc ? (
            <Paragraph color="$color" opacity={0.7} size="$4" lineHeight={22}>
              {desc}
            </Paragraph>
          ) : null}

          {/* Tags */}
          <XStack gap="$2" flexWrap="wrap">
            <Tag
              label={equipmentLabel}
              tone={exercise.equipment === "none" ? "default" : "secondary"}
            />
            <Tag
              icon={<Timer size={12} color="$color" opacity={0.7} />}
              label={t("exercises.seconds_per_rep", {
                count: exercise.secondsPerRep,
                defaultValue: `${exercise.secondsPerRep}s`,
              })}
              tone="primary"
            />
          </XStack>

          {/* Muscles */}
          {exercise.muscles.length > 0 && (
            <YStack gap="$2">
              <Text fontWeight="800" fontSize={13} color="$color" opacity={0.5}>
                {t("exercises.muscles", "Muscles").toUpperCase()}
              </Text>
              <XStack gap="$2" flexWrap="wrap">
                {exercise.muscles.map((m) => (
                  <Tag key={m} label={MUSCLE_LABELS[m]?.[language] ?? m} tone="success" />
                ))}
              </XStack>
            </YStack>
          )}
        </YStack>
      </Card>
    </YStack>
  );
}

function InvalidIdView({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  return (
    <YStack flex={1} bg="$background" justify="center" items="center" p="$6" gap="$4">
      <Text fontSize={48}>🤷</Text>
      <Text fontWeight="900" fontSize={18} color="$color">
        {t("exercises.invalid_id", "Exercise not found")}
      </Text>
      <AppButton fullWidth={false} variant="secondary" onPress={onBack}>
        {t("exercises.go_back", "Go back")}
      </AppButton>
    </YStack>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

export default function ExerciseDetails() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const { t } = useTranslation();

  const exerciseId = parseId(params.id);

  const [status, setStatus] = useState<Status>("loading");
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(
    async (id: number) => {
      setStatus("loading");
      setError("");
      try {
        const data = await getExerciseById(id);
        if (!data) {
          setError(t("exercises.not_found", "Exercise not found"));
          setStatus("error");
          return;
        }
        setExercise(data);
        setStatus("ready");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
        setStatus("error");
      }
    },
    [t],
  );

  useEffect(() => {
    if (exerciseId) load(exerciseId);
  }, [exerciseId, load]);

  const goBack = () => router.back();

  if (!exerciseId) return <InvalidIdView onBack={goBack} />;

  return (
    <YStack flex={1} bg="$background">
      <ScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + 24,
          minHeight: "100%",
        }}
        showsVerticalScrollIndicator={false}
      >
        <YStack p="$5" pt={insets.top + 12} gap="$5">
          <Header onBack={goBack} title={t("exercises.details_title", "Exercise")} />

          {status === "loading" && <LoadingCard />}
          {status === "error" && <ErrorCard message={error} onRetry={() => load(exerciseId)} />}
          {status === "ready" && exercise && <ExerciseContent exercise={exercise} />}
        </YStack>
      </ScrollView>
    </YStack>
  );
}
