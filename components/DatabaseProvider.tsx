import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { openDatabaseSync } from "expo-sqlite";
import { type ReactNode, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import { db, SCHEMA_VERSION } from "@/db/client";
import migrations from "../drizzle/migrations";

interface DatabaseProviderProps {
  children: ReactNode;
  onReady?: () => void;
}

export function DatabaseProvider({ children, onReady }: DatabaseProviderProps) {
  const { t } = useTranslation();
  const { success, error } = useMigrations(db, migrations);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!success || hasInitialized.current) return;
    hasInitialized.current = true;

    // Save schema version after successful migration
    try {
      const rawDb = openDatabaseSync("bati.db");
      rawDb.runSync(
        `INSERT OR REPLACE INTO user_preferences (key, value, updatedAt) VALUES ('schema_version', ?, ?)`,
        [String(SCHEMA_VERSION), Date.now()],
      );
    } catch (e) {
      console.warn("Failed to save schema version:", e);
    }

    onReady?.();
  }, [success, onReady]);

  if (error) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#FFF5E6",
        }}
      >
        <Text style={{ color: "#1A1A2E", fontSize: 16 }}>
          {t("common.error")}: {error.message}
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
          backgroundColor: "#FFF5E6",
        }}
      >
        <Text style={{ color: "#1A1A2E", fontSize: 18, fontWeight: "700" }}>🏰 Bati</Text>
        <Text style={{ color: "#1A1A2E", opacity: 0.6, marginTop: 8 }}>
          {t("splash.loading", "Building your village...")}
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}
