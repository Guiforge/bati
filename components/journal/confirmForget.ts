import type { TFunction } from "i18next";
import { Alert } from "react-native";
import { reportError } from "@/src/reportError";
import { forgetSession } from "@/stores/session";

/**
 * Ask before a session leaves the journal, then take it out.
 *
 * Both doors use it: the session detail and the victory screen, which has already saved by the
 * time it can offer anything. A wrong session or a run with the GPS forgotten is something only the
 * hero knows, and the XP leaves with it, so a stray tap must never be enough. `onForgotten` runs
 * once the row is gone; a campaign that has moved past the session says why and keeps it.
 */
export function confirmForget(sessionId: number, t: TFunction, onForgotten: () => void): void {
  Alert.alert(t("journal.forget_title"), t("journal.forget_body"), [
    { text: t("common.cancel"), style: "cancel" },
    {
      text: t("journal.forget_confirm"),
      style: "destructive",
      onPress: () => {
        forgetSession(sessionId)
          .then((outcome) => {
            if (outcome === "locked") Alert.alert(t("journal.forget_locked"));
            else onForgotten();
          })
          .catch((e) => {
            reportError("journal.forget", e);
            Alert.alert(t("common.error"));
          });
      },
    },
  ]);
}
