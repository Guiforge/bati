import { useTranslation } from "react-i18next";
import { useConfirmDialog } from "@/components/common/useConfirmDialog";
import { reportError } from "@/src/reportError";
import { forgetSession } from "@/stores/session";

/**
 * Ask before a session leaves the journal, then take it out. The caller renders `dialog` once.
 *
 * Both doors use it: the session detail and the victory screen, which has already saved by the
 * time it can offer anything. A wrong session or a run with the GPS forgotten is something only the
 * hero knows, and the XP leaves with it, so a stray tap must never be enough. `onForgotten` runs
 * once the row is gone; a campaign that has moved past the session says why and keeps it.
 */
export function useConfirmForget() {
  const { t } = useTranslation();
  const { ask, dialog } = useConfirmDialog();

  const confirmForget = (sessionId: number, onForgotten: () => void) => {
    ask({
      title: t("journal.forget_title"),
      body: t("journal.forget_body"),
      cancelLabel: t("common.cancel"),
      confirmLabel: t("journal.forget_confirm"),
      destructive: true,
      onConfirm: () => {
        forgetSession(sessionId)
          .then((outcome) => {
            if (outcome === "locked") {
              ask({
                title: t("journal.forget_locked_title"),
                body: t("journal.forget_locked"),
                confirmLabel: t("common.close"),
              });
            } else onForgotten();
          })
          .catch((e) => {
            reportError("journal.forget", e);
            ask({ title: t("common.error"), body: "", confirmLabel: t("common.close") });
          });
      },
    });
  };

  return { confirmForget, dialog };
}
