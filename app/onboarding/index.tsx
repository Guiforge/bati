import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { db } from "@/db/client";
import { userSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

export default function OnboardingIndex() {
  const [disclaimerAcknowledged, setDisclaimerAcknowledged] = useState<boolean | null>(null);

  useEffect(() => {
    checkDisclaimer();
  }, []);

  const checkDisclaimer = async () => {
    try {
      const result = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.key, "disclaimer_acknowledged"))
        .limit(1);

      setDisclaimerAcknowledged(result.length > 0 && result[0].value === "true");
    } catch (error) {
      console.error("Failed to check disclaimer:", error);
      setDisclaimerAcknowledged(false);
    }
  };

  if (disclaimerAcknowledged === null) {
    return null; // Loading
  }

  if (!disclaimerAcknowledged) {
    return <Redirect href="/onboarding/disclaimer" />;
  }

  return <Redirect href="/onboarding/presentation" />;
}
