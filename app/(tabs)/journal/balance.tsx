import { useTranslation } from "react-i18next";
import { YStack } from "tamagui";
import { MuscleBalanceCard } from "@/components/journal/MuscleBalanceCard";
import { NPage } from "@/components/journal/nocturne";
import { SuggestedQuestsCard } from "@/components/journal/SuggestedQuestsCard";

/**
 * The balance in full, and the quests for what is behind, on one page: the two blocks read the
 * same thirty days and used to sit one above the other on the stats page, saying it twice. The
 * stats page keeps the stacked bar and the verdict, and links here.
 */
export default function BalanceScreen() {
  const { t } = useTranslation();
  return (
    <NPage title={t("journal.balance_title")} testID="journal-balance">
      <YStack gap={8}>
        <MuscleBalanceCard />
        <SuggestedQuestsCard />
      </YStack>
    </NPage>
  );
}
