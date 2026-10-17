import { useNavigation } from "expo-router";
import { useEffect, useRef } from "react";
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
  const navigation = useNavigation();
  const { ask, dialog } = useConfirmDialog();
  const allowed = useRef(false);

  // The ref is read when the hero leaves, never during render (the React Compiler skips a
  // component that reads one in its body).
  useEffect(() => {
    return navigation.addListener("beforeRemove", (e) => {
      if (allowed.current || !dirty) return;
      e.preventDefault();
      ask({
        title: t("quests.editor_discard_title"),
        body: t("quests.editor_discard_body"),
        confirmLabel: t("quests.editor_discard"),
        cancelLabel: t("common.cancel"),
        destructive: true,
        onConfirm: () => navigation.dispatch(e.data.action),
      });
    });
  }, [navigation, ask, t, dirty]);

  return {
    dialog,
    allowLeave: () => {
      allowed.current = true;
    },
  };
}
