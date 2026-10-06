import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, YStack } from "tamagui";

import { AppButton } from "@/components/common/AppButton";
import type { DiagnosticStep } from "@/src/cloudSync";
import { reportError } from "@/src/reportError";
import { diagnosticLine, diagnosticText, diagnosticWhy } from "@/src/syncWords";
import { appVersion } from "@/src/updateCheck";

/**
 * "Test the connection": asks the server what sync needs, step by step, and shows each answer. The
 * toast after a failed connection says one thing ("HTTP 400"); this says which request the server
 * refused and what it said, in words the hero can send to whoever runs the server.
 *
 * It sits in a sheet, outside the toast provider, so it reports through its own button label.
 */
export function ConnectionTest({ run }: { run: () => Promise<DiagnosticStep[]> }) {
  const { t } = useTranslation();
  const [steps, setSteps] = useState<DiagnosticStep[] | null>(null);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);

  const start = () => {
    setRunning(true);
    setCopied(false);
    run()
      .then(setSteps)
      .catch((error: unknown) => reportError("sync.test", error))
      .finally(() => setRunning(false));
  };

  const copy = () => {
    if (steps === null) return;
    Clipboard.setStringAsync(diagnosticText(t, steps, appVersion))
      .then(() => setCopied(true))
      .catch((error: unknown) => reportError("sync.test.copy", error));
  };

  return (
    <YStack gap="$2">
      <AppButton testID="sync-test" variant="outline" disabled={running} onPress={start}>
        {running ? t("sync.test.running") : t("sync.test.cta")}
      </AppButton>
      {steps !== null && steps.length === 0 ? (
        <Text testID="sync-test-nothing" color="$textSecondary" fontSize="$3">
          {t("sync.test.nothing")}
        </Text>
      ) : null}
      {steps?.map((step) => {
        const line = diagnosticLine(t, step);
        const why = diagnosticWhy(t, step);
        return (
          <YStack key={step.id} gap="$0.5">
            <Text
              testID="sync-test-step"
              accessibilityLabel={`${t(step.ok ? "sync.test.passed" : "sync.test.failed")} ${line}`}
              color={step.ok ? "$text" : "$error"}
              fontSize="$3"
            >
              {step.ok ? "✓" : "✗"} {line}
            </Text>
            {why ? (
              <Text color="$textSecondary" fontSize="$2" selectable>
                {why}
              </Text>
            ) : null}
          </YStack>
        );
      })}
      {steps !== null && steps.length > 0 ? (
        <AppButton testID="sync-test-copy" variant="outline" size="$2" onPress={copy}>
          {copied ? t("sync.test.copied") : t("sync.test.copy")}
        </AppButton>
      ) : null}
    </YStack>
  );
}
