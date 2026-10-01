import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView as RNScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Paragraph, Text, XStack, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { ScreenBackButton } from "@/components/common/ScreenBackButton";
import { ExerciseRow } from "@/components/exercises/ExerciseRow";
import { EyeOff } from "@/components/icons";
import { shortDate } from "@/components/journal/journalFormat";
import { getExerciseThumb } from "@/constants/assetMap";
import { type Exercise, listExercises } from "@/db/exercises";
import { preferences } from "@/db/preferences";
import { useSetAside } from "@/hooks/useSetAside";
import { localizedName } from "@/src/i18n/localized";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";

/**
 * What the hero set aside (issue #145), and the way to put each one back.
 *
 * Nothing is added from here: the catalogue already finds an exercise, and its page is where
 * "Set aside" lives. A second search on this screen would be a second door to the same act.
 */
export default function SetAsideScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const language = useSettingsStore((s) => s.language);
  const { putBack } = useSetAside();
  const [rows, setRows] = useState<{ exercise: Exercise; at: number }[] | null>(null);

  // On focus: an exercise opened from this list can be put back from its own page.
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      Promise.all([preferences.getSetAsideExercises(), listExercises()])
        .then(([list, catalogue]) => {
          if (!alive) return;
          const byId = new Map(catalogue.map((e) => [e.id, e] as const));
          setRows(
            list.flatMap(({ id, at }) => {
              const exercise = byId.get(id);
              // An exercise deleted since it was set aside has nothing left to put back.
              return exercise ? [{ exercise, at }] : [];
            }),
          );
        })
        .catch((error) => reportError("setAside.list", error));
      return () => {
        alive = false;
      };
    }, []),
  );

  return (
    <YStack flex={1} bg="$background" pt={insets.top} pb={insets.bottom}>
      <XStack px="$4" py="$3" items="center" gap="$3">
        <ScreenBackButton />
        <XStack flex={1} items="center" gap="$2">
          <EyeOff size={20} color="$primaryText" />
          <Text fontSize={22} fontWeight="700" color="$text">
            {t("setAside.title")}
          </Text>
        </XStack>
      </XStack>

      <RNScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}>
        {rows === null ? null : rows.length === 0 ? (
          <Card gap="$3">
            <Paragraph color="$textSecondary">{t("setAside.empty")}</Paragraph>
            <AppButton
              fullWidth={false}
              variant="outline"
              onPress={() => router.push("/exercises" as never)}
            >
              {t("setAside.browse")}
            </AppButton>
          </Card>
        ) : (
          <>
            {rows.map(({ exercise, at }) => (
              <ExerciseRow
                key={exercise.id}
                exercise={exercise}
                language={language}
                thumb={getExerciseThumb(exercise.imagePath)}
                accessibilityLabel={localizedName(exercise, language)}
                caption={
                  <Text fontSize={12} color="$textSecondary" numberOfLines={1}>
                    {t("setAside.since", { date: shortDate(language, new Date(at)) })}
                  </Text>
                }
                onPress={() => router.push(`/exercises/${exercise.id}` as never)}
                trailing={
                  <AppButton
                    testID={`set-aside-put-back-${exercise.id}`}
                    fullWidth={false}
                    variant="outline"
                    size="$3"
                    fontSize={14}
                    onPress={() => {
                      // Off the list once the write holds: a row that vanished and comes back on
                      // the next focus reads as a second bug.
                      putBack(exercise)
                        .then((ok) => {
                          if (ok) {
                            setRows(
                              (prev) => prev?.filter((r) => r.exercise.id !== exercise.id) ?? prev,
                            );
                          }
                        })
                        .catch(() => {
                          // Reported by `useSetAside`, which never rejects.
                        });
                    }}
                  >
                    {t("setAside.put_back")}
                  </AppButton>
                }
              />
            ))}
            <Paragraph color="$textSecondary" size="$2" px="$1">
              {t("setAside.limits")}
            </Paragraph>
          </>
        )}
      </RNScrollView>
    </YStack>
  );
}
