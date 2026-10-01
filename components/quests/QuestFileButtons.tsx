import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { useToast } from "@/components/common/Toast";
import { Download, Share2 } from "@/components/icons";
import { importQuest, pickQuestFile, QuestFileError, shareQuest } from "@/src/questFile";
import { reportError } from "@/src/reportError";

/** A quest the hero wrote, sent as a file through the share sheet (`src/questFile.ts`). */
export function ShareQuestButton({ questId }: { questId: number }) {
  const { t } = useTranslation();
  const { showError } = useToast();
  const [busy, setBusy] = useState(false);
  // Read synchronously, unlike the state: a double tap ran the import twice, the second reporting
  // an update over the first.
  const working = useRef(false);

  const onPress = async () => {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    await shareQuest(questId).catch((error: unknown) => {
      reportError("quests.share", error);
      showError(t("quests.share_failed"));
    });
    working.current = false;
    setBusy(false);
  };

  return (
    <YStack gap="$2">
      <AppButton
        testID="quest-share"
        variant="outline"
        fontSize={16}
        icon={<Share2 size={18} color="$text" strokeWidth={2.5} />}
        disabled={busy}
        onPress={() => {
          onPress().catch((error: unknown) => reportError("quests.share", error));
        }}
      >
        {t("quests.share_quest")}
      </AppButton>
      {/* What the other side gets, said once under the button: the session pages explain theirs. */}
      <Text
        testID="quest-share-hint"
        fontSize={13}
        color="$textSecondary"
        style={{ textAlign: "center" }}
      >
        {t("quests.share_quest_hint")}
      </Text>
    </YStack>
  );
}

/**
 * A quest someone sent, read from a file and filed with the hero's own. Lives in the new-quest
 * editor, because receiving a quest is one more way to get a new one, and the gallery's "+" is
 * already where a hero goes for that.
 */
export function ImportQuestButton() {
  const { t } = useTranslation();
  const router = useRouter();
  const { showError, showSuccess } = useToast();
  const [busy, setBusy] = useState(false);
  // Read synchronously, unlike the state: a double tap ran the import twice, the second reporting
  // an update over the first.
  const working = useRef(false);

  const run = async () => {
    const file = await pickQuestFile();
    if (!file) return;
    const { id, updated } = await importQuest(file);
    showSuccess(t(updated ? "quests.import_updated" : "quests.import_done"));
    router.replace(`/quests/${id}` as never);
  };

  const onPress = async () => {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    await run().catch((error: unknown) => {
      if (error instanceof QuestFileError) {
        showError(t(`quests.import_${error.reason}`));
        return;
      }
      reportError("quests.import", error);
      showError(t("quests.import_failed"));
    });
    working.current = false;
    setBusy(false);
  };

  return (
    <YStack gap="$2">
      <AppButton
        testID="quest-import"
        variant="outline"
        fontSize={16}
        icon={<Download size={18} color="$text" strokeWidth={2.5} />}
        disabled={busy}
        onPress={() => {
          onPress().catch((error: unknown) => reportError("quests.import", error));
        }}
      >
        {t("quests.import_quest")}
      </AppButton>
      {/* What the other side gets, said once under the button: the session pages explain theirs. */}
      <Text
        testID="quest-import-hint"
        fontSize={13}
        color="$textSecondary"
        style={{ textAlign: "center" }}
      >
        {t("quests.import_hint")}
      </Text>
    </YStack>
  );
}
