import Constants from "expo-constants";
import * as Linking from "expo-linking";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useToast } from "@/components/common/Toast";
import { useConfirmDialog } from "@/components/common/useConfirmDialog";
import { buildBugReportMailto, readCrashLog, readErrorLog } from "@/src/crashLog";
import { reminderReportLine } from "@/src/reminderReport";
import { reportError } from "@/src/reportError";

// Version comes from the embedded manifest. The Android build number is derived from the version
// by app.config.js, so it is always present here; the iOS fallback is not, hence the guard.
const buildNumber =
  Constants.expoConfig?.android?.versionCode ?? Constants.expoConfig?.ios?.buildNumber;
export const versionLabel = [
  Constants.expoConfig?.version,
  buildNumber && `(${buildNumber})`,
  __DEV__ && "· DEV",
]
  .filter(Boolean)
  .join(" ");

/**
 * The reminders' line for the mail's technical block, or none. A report that cannot say how the
 * reminders behaved still goes: it is one line. Outside the hook for the React Compiler, which does
 * not lower a conditional inside a `try`.
 */
async function reminderLines(): Promise<string[]> {
  const line = await reminderReportLine().catch((error: unknown) => {
    reportError("settings.bugReportReminders", error);
    return null;
  });
  return line === null ? [] : [line];
}

/**
 * The one way a report leaves the device: a `mailto:` the hero's own mail client opens,
 * pre-filled with the crash log and the handled-error breadcrumbs, fully editable, sent only if
 * they press send. Lifted out of Settings so a failure can offer it at the moment it happens —
 * `alertWithReport` is what a catch block shows instead of a dead-end toast.
 */
export function useBugReport() {
  const { t } = useTranslation();
  const { showError } = useToast();
  const [crashCount, setCrashCount] = useState(0);
  const { ask, dialog } = useConfirmDialog();

  // Crashes only, not breadcrumbs: "3 reports" on the Settings row must mean three crashes,
  // not a healthy app whose widget redraw failed three times.
  useEffect(() => {
    readCrashLog()
      .then((reports) => setCrashCount(reports.length))
      .catch((error) => {
        // The row falls back to "0 reports"; the failure itself must not be one more silence.
        reportError("settings.crashLog", error);
      });
  }, []);

  // Reads the logs at press time rather than holding them in state: the draft should carry what
  // is on disk now, and the row only ever needed the count.
  const openBugReport = useCallback(async () => {
    try {
      const [reports, handled, reminders] = await Promise.all([
        readCrashLog(),
        readErrorLog(),
        reminderLines(),
      ]);
      const url = buildBugReportMailto(
        reports,
        handled,
        versionLabel,
        {
          subject: t("feedback.subject", { version: versionLabel }),
          prompt: t("feedback.prompt"),
          technicalHeader: t("feedback.technical_header"),
          noCrash: t("feedback.no_crash"),
          errorsHeader: t("feedback.errors_header"),
          noErrors: t("feedback.no_errors"),
        },
        reminders,
      );
      if (!(await Linking.canOpenURL(url))) {
        // Tapping the row and having nothing ever happen reads as broken, not as "no mail app".
        showError(t("settings.no_mail_client", "No email app found on this device"));
        return;
      }
      await Linking.openURL(url);
    } catch (error) {
      // Nothing was sent, which is the safe direction to fail in — but say so.
      reportError("settings.bugReport", error);
      showError(t("settings.no_mail_client", "No email app found on this device"));
    }
  }, [t, showError]);

  /**
   * What a catch block shows instead of a toast: the same human sentence, plus the one action
   * that turns a screenshot-only report into a diagnosable one. No technical detail on screen —
   * the cause is already in the error log and travels in the mail body.
   */
  const alertWithReport = useCallback(
    (message: string) => {
      ask({
        title: t("common.error"),
        body: message,
        confirmLabel: t("feedback.report_cta"),
        cancelLabel: t("common.close"),
        onConfirm: openBugReport,
      });
    },
    [ask, t, openBugReport],
  );

  // `dialog` is the in-app alert `alertWithReport` raises: every caller renders it once.
  return { openBugReport, alertWithReport, crashCount, dialog };
}
