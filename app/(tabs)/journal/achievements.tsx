import { useTranslation } from "react-i18next";
import { AchievementsCard } from "@/components/journal/AchievementsCard";
import { NPage } from "@/components/journal/nocturne";

/**
 * The whole shelf, filters and all. It left the stats page for a page of its own: a stats page
 * does not need five filter chips, and the stats page keeps the count and the next one to earn.
 */
export default function AchievementsScreen() {
  const { t } = useTranslation();
  return (
    <NPage title={t("journal.achievements_title")} testID="journal-achievements">
      <AchievementsCard />
    </NPage>
  );
}
