import { eq } from "drizzle-orm";
import { Redirect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { db } from "@/src/db/client";
import { userPreferences } from "@/src/db/schema";

export default function OnboardingIndex() {
  const [disclaimerAcknowledged, setDisclaimerAcknowledged] = useState<boolean | null>(null);

  const checkDisclaimer = useCallback(async () => {
    try {
      const result = await db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.key, "disclaimer_acknowledged"))
        .limit(1);

      setDisclaimerAcknowledged(result.length > 0 && result[0].value === "true");
    } catch (_error) {
      setDisclaimerAcknowledged(false);
    }
  }, []);

  useEffect(() => {
    checkDisclaimer();
  }, [checkDisclaimer]);

  if (disclaimerAcknowledged === null) {
    return null; // Loading
  }

  if (!disclaimerAcknowledged) {
    return <Redirect href="/onboarding/disclaimer" />;
  }

  return <Redirect href="/onboarding/presentation" />;
}
