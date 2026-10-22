import { usePreventRemove } from "expo-router";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { useConfirmDialog } from "@/components/common/useConfirmDialog";

/**
 * "Discard your changes?" before a screen with unsaved input is left by any road (back button,
 * gesture, header). The caller renders `dialog` once and calls `allowLeave()` just before its own
 * save navigates away, or the guard would stop the hero's own exit. The copy is the quest
 * editor's, which is where this question started.
 */
export function useDiscardGuard(dirty: boolean) {
  const { t } = useTranslation();
  const { ask, dialog } = useConfirmDialog();
  const allowed = useRef(false);

  // expo-router 58 has no `beforeRemove` event: a dirty screen is held back, and the hero's own
  // exit (`allowed`) is let through by repeating the very action that was stopped.
  usePreventRemove(dirty, ({ repeat }) => {
    if (allowed.current) {
      repeat();
      return;
    }
    ask({
      title: t("quests.editor_discard_title"),
      body: t("quests.editor_discard_body"),
      confirmLabel: t("quests.editor_discard"),
      cancelLabel: t("common.cancel"),
      destructive: true,
      onConfirm: repeat,
    });
  });

  return {
    dialog,
    allowLeave: () => {
      allowed.current = true;
    },
  };
}
