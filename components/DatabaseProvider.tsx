import * as SplashScreen from "expo-splash-screen";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import { rawColors } from "@/constants/rawColors";
import { ensureMigrations } from "@/db/migrate";

type MigrationState = { success: false; error?: Error } | { success: true; error?: undefined };

interface DatabaseProviderProps {
  children: ReactNode;
  onReady?: () => void;
}

export function DatabaseProvider({ children, onReady }: DatabaseProviderProps) {
  const { t } = useTranslation();

  const [migrationState, setMigrationState] = useState<MigrationState>({
    success: false,
  });
  const success = migrationState.success;
  const error = migrationState.error;
  const hasInitialized = useRef(false);
  const hasStartedMigrations = useRef(false);

  useEffect(() => {
    let cancelled = false;

    if (hasStartedMigrations.current) return;
    hasStartedMigrations.current = true;

    (async () => {
      try {
        setMigrationState({ success: false });
        // The runner itself lives in db/migrate.ts, shared with the headless widget task.
        await ensureMigrations();
        if (!cancelled) setMigrationState({ success: true });
      } catch (e) {
        if (cancelled) return;
        const err = e instanceof Error ? e : new Error(String(e));
        setMigrationState({ success: false, error: err });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!success || hasInitialized.current) return;
    hasInitialized.current = true;
    onReady?.();
  }, [success, onReady]);

  useEffect(() => {
    if (error) {
      SplashScreen.hideAsync();
    }
  }, [error]);

  if (error) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          // Dark-only app: a cream failure screen was the one white flash PRODUCT.md forbids.
          backgroundColor: rawColors.bgDark,
          padding: 20,
        }}
      >
        <Text style={{ color: rawColors.text, fontSize: 16, fontWeight: "bold", marginBottom: 10 }}>
          {t("common.error")}:
        </Text>
        <Text style={{ color: rawColors.error, fontSize: 14, marginBottom: 20 }}>
          {error.message.substring(0, 200)}
          {error.message.length > 200 ? "..." : ""}
        </Text>
        <Text style={{ color: rawColors.textSecondary, fontSize: 12, opacity: 0.7 }}>
          Check console for full details.
        </Text>
      </View>
    );
  }

  if (!success) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          // Dark-only app: a cream failure screen was the one white flash PRODUCT.md forbids.
          backgroundColor: rawColors.bgDark,
        }}
      >
        <Text style={{ color: rawColors.text, fontSize: 18, fontWeight: "700" }}>🏰 Bati</Text>
        <Text style={{ color: rawColors.textSecondary, opacity: 0.6, marginTop: 8 }}>
          {t("splash.loading", "Building your village...")}
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}
