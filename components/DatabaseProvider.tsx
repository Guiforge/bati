import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { type ReactNode, useEffect, useRef } from "react";
import { Text, View } from "react-native";
import { db } from "@/db/client";
import migrations from "../drizzle/migrations";

interface DatabaseProviderProps {
  children: ReactNode;
  onReady?: () => void;
}

export function DatabaseProvider({ children, onReady }: DatabaseProviderProps) {
  const { success, error } = useMigrations(db, migrations);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!success || hasInitialized.current) return;
    hasInitialized.current = true;

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
        <Text style={{ color: "#1A1A2E", fontSize: 16 }}>Database error: {error.message}</Text>
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
        <Text style={{ color: "#1A1A2E", opacity: 0.6, marginTop: 8 }}>Preparing database...</Text>
      </View>
    );
  }

  return <>{children}</>;
}
