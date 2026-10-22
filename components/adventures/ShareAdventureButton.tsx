import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { AppIconButton } from "@/components/common/AppButton";
import { useToast } from "@/components/common/Toast";
import type { useConfirmDialog } from "@/components/common/useConfirmDialog";
import { Share2 } from "@/components/icons";
import { adventureToFile, shareAdventure } from "@/src/adventureFile";
import { reportError } from "@/src/reportError";

/**
 * The hero's adventure, sent as a file through the share sheet (`src/adventureFile.ts`). A dialog
 * always comes first and says what leaves: the photos in the file, and what stays behind (steps
 * and photos the receiver could not read). Sharing reads and never writes, so a retired or
 * frozen adventure shares like any other.
 */
export function ShareAdventureButton({
  adventureId,
  ask,
}: {
  adventureId: number;
  ask: ReturnType<typeof useConfirmDialog>["ask"];
}) {
  const { t } = useTranslation();
  const { showError } = useToast();
  // Read synchronously, unlike a state: a double tap opened two dialogs.
  const working = useRef(false);

  const fail = (error: unknown) => {
    reportError("adventures.share", error);
    showError(t("adventures.share_failed"));
  };

  // No try/finally: the React Compiler does not compile a function that has one.
  const onPress = async () => {
    if (working.current) return;
    working.current = true;
    const out = await adventureToFile(adventureId).catch((error: unknown) => {
      fail(error);
      return undefined;
    });
    working.current = false;
    if (out === undefined) return;
    if (out === null) {
      showError(t("adventures.share_too_few"));
      return;
    }
    const { photos, leftOut, stepsLeft } = out;
    const body = [
      photos === 0
        ? t("adventures.share_no_photo")
        : t("adventures.share_photos", { count: photos }),
      stepsLeft > 0 ? t("adventures.share_steps_left", { count: stepsLeft }) : null,
      leftOut > 0 ? t("adventures.share_photos_left", { count: leftOut }) : null,
    ]
      .filter(Boolean)
      .join(" ");
    ask({
      title: t("adventures.share_title"),
      body,
      confirmLabel: t("adventures.share_confirm"),
      cancelLabel: t("common.cancel"),
      onConfirm: () => {
        shareAdventure(out.json, out.file.adventure.title).catch(fail);
      },
    });
  };

  return (
    <AppIconButton
      testID="adventure-share"
      onPress={() => {
        onPress().catch(fail);
      }}
      accessibilityRole="button"
      accessibilityLabel={t("adventures.share")}
    >
      <Share2 size={20} color="text" />
    </AppIconButton>
  );
}
