import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
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
import { ADMIN_CREATOR } from "@/db/schema";
import { setImpactAside } from "@/db/setAside";
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

  // Whether a seeded jump is still being served: what the one group action below is for.
  const [jumpsLeft, setJumpsLeft] = useState(false);
  const [settingJumpsAside, setSettingJumpsAside] = useState(false);
  // The state above greys the button on the next render; this holds within the same frame, where
  // two taps would both have read `false` and started two passes over the same list.
  const settingJumpsAsideNow = useRef(false);

  const load = useCallback(
    (isAlive: () => boolean = () => true) =>
      Promise.all([preferences.getSetAsideExercises(), listExercises()])
        .then(([list, catalogue]) => {
          if (!isAlive()) return;
          const byId = new Map(catalogue.map((e) => [e.id, e] as const));
          const aside = new Set(list.map((e) => e.id));
          setJumpsLeft(
            catalogue.some((e) => e.impact && e.creator === ADMIN_CREATOR && !aside.has(e.id)),
          );
          setRows(
            list.flatMap(({ id, at }) => {
              const exercise = byId.get(id);
              // An exercise deleted since it was set aside has nothing left to put back.
              return exercise ? [{ exercise, at }] : [];
            }),
          );
        })
        .catch((error) => reportError("setAside.list", error)),
    [],
  );

  // On focus: an exercise opened from this list can be put back from its own page.
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      // Never rejects: `load` reports its own failure.
      load(() => alive).catch(() => undefined);
      return () => {
        alive = false;
      };
    }, [load]),
  );

  // The one thing added from here, and it is not a second door to the catalogue: no search finds
  // "everything that jumps". For a hero who cannot jump, one tap instead of meeting each of the
  // six mid-warm-up. Each lands in the list above, where it is put back like any other.
  // No toast and no "Put back" on one: the answer is the six rows that appear right above, each
  // with its own. Disabled while it writes, because the six writes run one after the other and
  // a second tap would start a second pass over the same list.
  const allJumps = jumpsLeft ? (
    <AppButton
      testID="set-aside-all-jumps"
      fullWidth={false}
      variant="outline"
      disabled={settingJumpsAside}
      onPress={() => {
        if (settingJumpsAsideNow.current) return;
        settingJumpsAsideNow.current = true;
        setSettingJumpsAside(true);
        setImpactAside()
          .then(() => load())
          .catch((error) => reportError("setAside.allJumps", error))
          .finally(() => {
            settingJumpsAsideNow.current = false;
            setSettingJumpsAside(false);
          });
      }}
    >
      {t("setAside.all_jumps")}
    </AppButton>
  ) : null;

  return (
    <YStack flex={1} bg="$background" pt={insets.top} pb={insets.bottom}>
      <XStack px="$4" py="$3" items="center" gap="$3">
        <ScreenBackButton />
        <XStack flex={1} items="center" gap="$2">
          <EyeOff size={20} color="$primaryText" />
          <Text fontFamily="$heading" fontSize={22} fontWeight="700" color="$text">
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
            {allJumps}
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
            {allJumps}
            <Paragraph color="$textSecondary" size="$2" px="$1">
              {t("setAside.limits")}
            </Paragraph>
          </>
        )}
      </RNScrollView>
    </YStack>
  );
}
