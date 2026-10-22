import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { useToast } from "@/components/common/Toast";
import { useConfirmDialog } from "@/components/common/useConfirmDialog";
import { Download, Share2 } from "@/components/icons";
import { questToShare } from "@/src/adventureFile";
import { holdIncomingFile } from "@/src/incomingFile";
import { pickQuestFile, shareQuest } from "@/src/questFile";
import { reportError } from "@/src/reportError";

/**
 * A quest the hero wrote, sent as a file through the share sheet (`src/questFile.ts`). A dialog
 * comes first and says what leaves: the photos in the file, and those that stay behind.
 */
export function ShareQuestButton({ questId }: { questId: number }) {
  const { t } = useTranslation();
  const { showError } = useToast();
  const { ask, dialog } = useConfirmDialog();
  const [busy, setBusy] = useState(false);
  // Read synchronously, unlike the state: a double tap ran the import twice, the second reporting
  // an update over the first.
  const working = useRef(false);

  const fail = (error: unknown) => {
    reportError("quests.share", error);
    showError(t("quests.share_failed"));
  };

  const onPress = async () => {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    const out = await questToShare(questId).catch((error: unknown) => {
      fail(error);
      return undefined;
    });
    working.current = false;
    setBusy(false);
    if (out === undefined) return;
    const { photos, leftOut, file, json } = out;
    ask({
      title: t("quests.share_title"),
      body: [
        photos === 0 ? t("quests.share_no_photo") : t("quests.share_photos", { count: photos }),
        leftOut > 0 ? t("quests.share_photos_left", { count: leftOut }) : null,
      ]
        .filter(Boolean)
        .join(" "),
      confirmLabel: t("quests.share_confirm"),
      cancelLabel: t("common.cancel"),
      onConfirm: () => {
        shareQuest(json, file.quest.title.en).catch(fail);
      },
    });
  };

  return (
    <YStack gap="2">
      <AppButton
        testID="quest-share"
        variant="outline"
        fontSize={16}
        icon={<Share2 size={18} color="text" strokeWidth={2.5} />}
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
        color="textSecondary"
        style={{ textAlign: "center" }}
      >
        {t("quests.share_quest_hint")}
      </Text>
      {dialog}
    </YStack>
  );
}

/**
 * A quest or an adventure someone sent, read from a file and filed with the hero's own. Lives on
 * the Forge page, the one door: the preview screen reads the kind from the file, and decides
 * where the import lands.
 */
export function ImportFileButton({
  label,
  hint,
  failed,
  testID,
}: {
  /** i18n keys, not sentences: the button translates them. */
  label: string;
  hint: string;
  failed: string;
  testID: string;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const { showError } = useToast();
  const [busy, setBusy] = useState(false);
  // Read synchronously, unlike the state: a double tap ran the import twice, the second reporting
  // an update over the first.
  const working = useRef(false);

  // The picker only finds the file: the preview reads it and imports it, the same screen a file
  // tapped in a chat opens on (`app/quest-import.tsx`).
  const run = async () => {
    const uri = await pickQuestFile();
    if (!uri) return;
    // The URI is held aside, never in the route.
    router.push(`/quest-import?n=${holdIncomingFile(uri)}` as never);
  };

  const onPress = async () => {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    await run().catch((error: unknown) => {
      reportError("quests.import", error);
      showError(t(failed));
    });
    working.current = false;
    setBusy(false);
  };

  return (
    <YStack gap="2">
      <AppButton
        testID={testID}
        variant="outline"
        fontSize={16}
        icon={<Download size={18} color="text" strokeWidth={2.5} />}
        disabled={busy}
        onPress={() => {
          onPress().catch((error: unknown) => reportError("quests.import", error));
        }}
      >
        {t(label)}
      </AppButton>
      {/* What the other side gets, said once under the button: the session pages explain theirs. */}
      <Text
        testID={`${testID}-hint`}
        fontSize={13}
        color="textSecondary"
        style={{ textAlign: "center" }}
      >
        {t(hint)}
      </Text>
    </YStack>
  );
}
