import { Image } from "expo-image";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { ImageSourcePropType } from "react-native";
import { Paragraph, Text, XStack, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { Tag } from "@/components/common/Tag";
import { ChevronDown, ChevronUp, Dumbbell, Footprints } from "@/components/icons";
import { getExerciseThumb } from "@/constants/assetMap";
import { EQUIPMENT_LABELS } from "@/db/equipment";
import { formatDuration } from "@/db/estimate";
import { MUSCLE_LABELS } from "@/db/muscles";
import type { QuestExercise } from "@/db/quests";
import { formatTarget, type Target } from "@/db/targets";
import { NON_REP_STYLE } from "@/db/workUnits";
import type { AppLanguage } from "@/src/i18n/deviceLanguage";
import { localizedName } from "@/src/i18n/localized";

/** A row of tiles reads fine; past four it was a nested horizontal ScrollView. */
const MAX_THUMBS = 4;
/** Same cut the gallery card makes: past four muscles the row stops being a summary. */
const MUSCLES_SHOWN = 4;

function resolveExerciseImage(path?: string | null): ImageSourcePropType | null {
  if (!path) return null;
  return path.startsWith("http") ? { uri: path } : getExerciseThumb(path);
}

/**
 * A target in the words the hero reads it in.
 *
 * `formatTarget` prints seconds raw, which is fine at plank length and unreadable past a minute:
 * an expedition asks for 900, and "900s" is not a number anybody converts. Time targets go
 * through `formatDuration`, the app's own exact form — "15 min" above the minute, still "30s"
 * below it, so nothing shorter than a round changes. Reps stay `formatTarget`'s job.
 */
function targetLabel(target: Target): string {
  return target.type === "time" ? formatDuration(target.value) : formatTarget(target);
}

/** Everything the shut row leaves out: the art, the how-to, and the way to the movement's screen. */
function ExerciseDetail({
  qex,
  language,
  onOpenExercise,
}: {
  qex: QuestExercise;
  language: AppLanguage;
  onOpenExercise: () => void;
}) {
  const { t } = useTranslation();

  const thumbs = Array.from(new Set([qex.exercise.imagePath, ...qex.images].filter(Boolean)))
    .slice(0, MAX_THUMBS)
    .flatMap((path) => {
      const source = resolveExerciseImage(path);
      // Only keep thumbs that actually resolve to a real image; a row of fallback-emoji tiles is
      // noise, not content.
      return source != null && typeof path === "string" ? [{ key: path, source }] : [];
    });

  return (
    <YStack gap="$2">
      {thumbs.length > 0 ? (
        <XStack gap="$2">
          {thumbs.map((thumb) => (
            <YStack
              key={thumb.key}
              width={64}
              height={64}
              rounded={12}
              overflow="hidden"
              bg="$surface"
              borderWidth={1}
              borderColor="$borderStrong"
            >
              <Image
                source={thumb.source}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                transition={0}
              />
            </YStack>
          ))}
        </XStack>
      ) : null}

      <Paragraph color="$textSecondary" size="$3">
        {language === "fr" ? qex.exercise.frDescription : qex.exercise.enDescription}
      </Paragraph>

      <XStack gap="$2" flexWrap="wrap">
        <Tag
          label={EQUIPMENT_LABELS[qex.exercise.equipment]?.[language] ?? qex.exercise.equipment}
        />
        {qex.target.type === "reps" ? (
          <Tag
            label={t("quests.seconds_per_rep", {
              count: qex.exercise.secondsPerRep,
              defaultValue: `${qex.exercise.secondsPerRep}s/rep`,
            })}
            tone="secondary"
          />
        ) : null}
        {qex.exercise.muscles.slice(0, MUSCLES_SHOWN).map((m) => (
          <Tag key={m} label={MUSCLE_LABELS[m]?.[language] ?? m} />
        ))}
        {qex.exercise.muscles.length > MUSCLES_SHOWN ? (
          <Tag label={`+${qex.exercise.muscles.length - MUSCLES_SHOWN}`} />
        ) : null}
      </XStack>

      <AppButton
        fullWidth={false}
        variant="outline"
        size="$3"
        fontSize={14}
        onPress={onOpenExercise}
      >
        {t("quests.open_exercise", "See the movement")}
      </AppButton>
    </YStack>
  );
}

/**
 * One movement of a quest, shut by default.
 *
 * It used to open at full height: number, name, "Working up to Squat", a strip of art, three lines
 * of how-to, then the equipment, the tempo and four muscles. Three of those and the list alone was
 * two screens, for a hero who came to read three names (UX audit 2026-09-10). The six elements are
 * all still here; what changed is that the three the hero came for — the name, the target, what
 * they managed last time — are the only ones the shut row spends height on.
 *
 * Tapping expands rather than navigating, because the how-to is what the tap is usually for. The
 * movement's own screen, which also carries its ladder and its records, keeps a door inside.
 */
export function QuestExerciseRow({
  qex,
  index,
  language,
  showTarget,
  onOpenExercise,
}: {
  qex: QuestExercise;
  index: number;
  language: AppLanguage;
  /**
   * False on an outing set by distance: the slot's seconds are the fallback `outingGoal` never
   * reads, and a chip saying "15 min" beside a 5 km goal is the screen contradicting itself about
   * what is going to run. The goal is named once, in the panel above.
   */
  showTarget: boolean;
  onOpenExercise: () => void;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const name = language === "fr" ? qex.exercise.frName : qex.exercise.enName;
  const thumb = resolveExerciseImage(qex.exercise.imagePath);
  const Chevron = expanded ? ChevronUp : ChevronDown;

  return (
    <Card gap="$3">
      {/* The press sits on the header rather than on the card: the panel it opens carries its own
          button, and a nested control inside a pressable card is a tap two handlers argue over. */}
      <XStack
        gap="$3"
        items="center"
        onPress={() => setExpanded((open) => !open)}
        pressStyle={{ opacity: 0.6 }}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        {/* The movement's own painting, not an icon.
            A dumbbell on every row is the journal's old thumbnail problem in a smaller circle:
            three rows that look identical, with the name as the only thing telling them apart,
            on a screen whose whole job is answering "what am I about to do". The icon stays as
            the fallback for a movement with no art, and an outing is never a dumbbell. */}
        <YStack
          width={44}
          height={44}
          rounded={22}
          bg="$surface"
          borderWidth={1}
          borderColor="$borderStrong"
          justify="center"
          items="center"
          overflow="hidden"
        >
          {thumb ? (
            <Image
              source={thumb}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              transition={0}
              accessible={false}
            />
          ) : qex.exercise.style === NON_REP_STYLE ? (
            <Footprints size={22} color="$text" strokeWidth={2.5} />
          ) : (
            <Dumbbell size={22} color="$text" strokeWidth={2.5} />
          )}
        </YStack>

        <YStack flex={1} minW={0} gap="$1">
          {/* The name gets the row's width, and the tags sit under it.
              They used to share the line: two tags and a chevron hold their width on the right,
              so "2. Wall Push-Up" beside "10 reps" and "Last: 19 reps" was starved down to
              "2. Wall…" with its subtitle broken one word per line. A name is what the hero is
              scanning for, so it is the thing that must never be the one that gives. */}
          <Text fontWeight="700" fontSize={17} color="$text" numberOfLines={2}>
            {index + 1}. {name}
          </Text>

          {/* A slot the hero is not on the rung for is served easier (issue #33). Said out loud,
              or the card disagrees with the quest for no visible reason — and the movement it
              names stays one tap away through swap. */}
          {qex.substitutedFor ? (
            <Text fontSize={12} color="$textSecondary" fontFamily="$body">
              {t("quests.served_easier_rung", {
                name: localizedName(qex.substitutedFor, language),
                defaultValue: `Working up to ${localizedName(qex.substitutedFor, language)}`,
              })}
            </Text>
          ) : null}

          <XStack items="center" gap="$2" flexWrap="wrap">
            {showTarget ? (
              <Tag
                label={targetLabel(qex.target)}
                tone={qex.target.type === "time" ? "secondary" : "primary"}
              />
            ) : null}
            {/* What the hero did on this movement last time, in the slot's own unit. In the shut
              row rather than in the config card's steppers: that card is folded shut by default,
              and this is the number that decides whether the target is a stretch. */}
            {qex.ghost ? (
              <Tag
                label={t("quests.ghost_last", {
                  value: targetLabel({ type: qex.target.type, value: qex.ghost.last }),
                  defaultValue: `Last: ${qex.ghost.last}`,
                })}
                tone="secondary"
              />
            ) : null}
          </XStack>
        </YStack>

        <Chevron size={18} color="$textSecondary" strokeWidth={2.5} />
      </XStack>

      {expanded ? (
        <ExerciseDetail qex={qex} language={language} onOpenExercise={onOpenExercise} />
      ) : null}
    </Card>
  );
}
