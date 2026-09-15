import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { XStack, YStack } from "tamagui";
import { AchievementIcon } from "@/components/common/AchievementIcon";
import { Lock } from "@/components/icons";
import { formatCount, formatShare } from "@/components/journal/journalFormat";
import { NBar, NBlock, NButton, NMuted, NNum, NText } from "@/components/journal/nocturne";
import { type AchievementProgress, getAllAchievementsWithProgress } from "@/db/achievements";
import { localizedText, localizedTitle } from "@/src/i18n/localized";
import { reportError } from "@/src/reportError";
import { type AppLanguage, useSettingsStore } from "@/stores/settings";

type CategoryFilter = "all" | "sessions" | "streaks" | "xp" | "special";

const CATEGORIES: readonly CategoryFilter[] = ["all", "sessions", "streaks", "xp", "special"];

/** Enough to show the shelf without the card swallowing the stats tab. */
const COLLAPSED_ROWS = 8;

/**
 * The shelf, in Nocturne blocks like the rest of the Journal: the count and its bar, the filters as
 * outlined buttons, one block per achievement. Earned ones take the accent; the rest stay quiet
 * with how far they are. The pastel card with a green row per unlock was the last screen of the
 * Journal still drawn in the old style.
 *
 * `showAll` is for the shelf's own page, where a "+19 more" fold only hides what it came for.
 */
export function AchievementsCard({ showAll = false }: { showAll?: boolean }) {
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  const [achievements, setAchievements] = useState<AchievementProgress[] | null>(null);
  const [filter, setFilter] = useState<CategoryFilter>("all");
  const [expanded, setExpanded] = useState(showAll);

  useEffect(() => {
    getAllAchievementsWithProgress()
      .then(setAchievements)
      // A card that failed to load looks exactly like a card with nothing to show.
      .catch((error) => reportError("journal.achievements", error));
  }, []);

  // The place the shelf will take, and nothing in it: a loading shelf says nothing about the hero.
  if (!achievements) return <YStack minH={400} />;

  const total = achievements.length;
  const unlocked = achievements.filter((a) => a.isUnlocked).length;
  // Unlocked first, then the closest to done.
  const sorted = achievements
    .filter((a) => filter === "all" || a.definition.category === filter)
    .sort((a, b) => Number(b.isUnlocked) - Number(a.isUnlocked) || b.progress - a.progress);
  const shown = expanded ? sorted : sorted.slice(0, COLLAPSED_ROWS);

  return (
    <YStack gap={6}>
      <NBlock>
        <XStack items="baseline" justify="space-between" gap={8}>
          <NText fontSize={13.5} lineHeight={19}>
            {t("achievements.progress", { unlocked, total })}
          </NText>
          <NNum fontSize={21} lineHeight={26} color="$resourceGold">
            {formatShare(language, total > 0 ? (unlocked / total) * 100 : 0)}
          </NNum>
        </XStack>
        <YStack mt={8}>
          <NBar progress={total > 0 ? (unlocked / total) * 100 : 0} />
        </YStack>
      </NBlock>

      <XStack flexWrap="wrap" gap={6} py={5}>
        {CATEGORIES.map((key) => (
          <NButton
            key={key}
            minH={44}
            variant={filter === key ? "primary" : "secondary"}
            onPress={() => setFilter(key)}
          >
            {t(`achievements.filter_${key}`)}
          </NButton>
        ))}
      </XStack>

      {shown.map((achievement) => (
        <AchievementRow key={achievement.code} achievement={achievement} language={language} />
      ))}

      {/* The count was a dead end: it named the rest of the shelf without a way to reach it. */}
      {sorted.length > COLLAPSED_ROWS && (
        <NText
          fontSize={12.5}
          color="$resourceGold"
          style={{ textAlign: "center" }}
          py={11}
          hitSlop={12}
          accessibilityRole="button"
          onPress={() => setExpanded((value) => !value)}
        >
          {expanded
            ? t("achievements.show_less")
            : t("achievements.more_count", { count: sorted.length - COLLAPSED_ROWS })}
        </NText>
      )}
    </YStack>
  );
}

function AchievementRow({
  achievement,
  language,
}: {
  achievement: AchievementProgress;
  language: AppLanguage;
}) {
  const { definition, isUnlocked, progress, currentValue, targetValue } = achievement;

  return (
    <NBlock>
      <XStack gap={11} items="center">
        <YStack width={32} items="center">
          {isUnlocked ? (
            <AchievementIcon icon={definition.icon} size={26} color="$resourceGold" />
          ) : (
            <Lock size={18} color="$muted" />
          )}
        </YStack>
        <YStack flex={1} minW={0}>
          <XStack items="baseline" gap={8}>
            <NText
              flex={1}
              fontSize={14}
              lineHeight={20}
              numberOfLines={1}
              color={isUnlocked ? "$text" : "$textSecondary"}
            >
              {localizedTitle(definition, language)}
            </NText>
            {isUnlocked ? null : (
              <NNum fontSize={11.5} lineHeight={16} color="$textSecondary">
                {formatCount(language, currentValue)}/{formatCount(language, targetValue)}
              </NNum>
            )}
          </XStack>
          <NMuted numberOfLines={1}>{localizedText(definition, "description", language)}</NMuted>
          {!isUnlocked && targetValue > 1 ? (
            <YStack mt={6}>
              <NBar progress={progress} height={3} fill="$gold700" />
            </YStack>
          ) : null}
        </YStack>
      </XStack>
    </NBlock>
  );
}
