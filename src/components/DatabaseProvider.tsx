import * as SplashScreen from "expo-splash-screen";
import { openDatabaseSync } from "expo-sqlite";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import { db, SCHEMA_VERSION } from "@/src/db/client";
import migrations from "../drizzle/migrations";

function getMigrationKeyFromIdx(idx: number) {
  return `m${String(idx).padStart(4, "0")}`;
}

type MigrationState = { success: false; error?: Error } | { success: true; error?: undefined };

type SqliteMigrationClient = {
  execAsync: (source: string) => Promise<void>;
  getFirstAsync?: <T = unknown>(source: string, params?: readonly unknown[]) => Promise<T | null>;
  getAllAsync?: <T = unknown>(source: string, params?: readonly unknown[]) => Promise<T[]>;
};

async function runMigrationsAsync(
  client: SqliteMigrationClient,
  config: {
    journal: { entries: { idx: number; when: number; tag: string; breakpoints: boolean }[] };
    migrations: Record<string, string>;
  },
  opts: { debug: boolean },
) {
  // Create migrations table (same default name Drizzle uses).
  await client.execAsync(`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash TEXT NOT NULL,
      created_at NUMERIC
    )
  `);

  let lastCreatedAt = -Infinity;
  try {
    if (client.getFirstAsync) {
      const row = await client.getFirstAsync<{ created_at: number | string }>(
        "SELECT created_at FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 1",
      );
      if (row?.created_at !== undefined && row?.created_at !== null) {
        lastCreatedAt = Number(row.created_at);
      }
    }
  } catch {
    // Ignore if querying fails; we'll just apply all migrations.
  }

  const entries = config.journal.entries;
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex migration logic, refactor planned
  const runEntry = async (txn: { execAsync: (source: string) => Promise<void> }) => {
    for (const entry of entries) {
      if (Number.isFinite(lastCreatedAt) && lastCreatedAt >= entry.when) continue;

      const key = getMigrationKeyFromIdx(entry.idx);
      const raw = config.migrations[key];
      if (!raw) throw new Error(`Missing migration: ${entry.tag}`);

      const statements = raw
        .split("--> statement-breakpoint")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      // Safety: some older bundled schema migrations created a UNIQUE index on adventures.questId
      // (`adventures_quest_unique`). This breaks newer content where multiple adventures can
      // start from the same quest. Since we don't need retro-compat here, we skip creating it.
      // (Also helps if Metro/Expo has cached an older .sql asset.)
      const effectiveStatements = statements.filter((stmt) => {
        const shouldSkip = /CREATE\s+UNIQUE\s+INDEX\s+`adventures_quest_unique`/i.test(stmt);
        if (shouldSkip && opts.debug) {
          // biome-ignore lint/suspicious/noConsole: Debug logging
          console.log("[DatabaseProvider] Skipping statement (adventures_quest_unique)");
        }
        return !shouldSkip;
      });

      if (opts.debug) {
        // biome-ignore lint/suspicious/noConsole: Debug logging
        console.log(
          "[DatabaseProvider] Applying migration",
          entry.tag,
          `(idx=${entry.idx}, stmts=${effectiveStatements.length})`,
        );
      }

      for (let i = 0; i < effectiveStatements.length; i++) {
        const stmt = effectiveStatements[i];
        if (opts.debug) {
          // biome-ignore lint/suspicious/noConsole: Debug logging
          console.log(
            `[DatabaseProvider]  stmt ${i + 1}/${effectiveStatements.length}:`,
            stmt.slice(0, 120).replace(/\s+/g, " "),
          );
        }
        try {
          await txn.execAsync(stmt);
        } catch (e) {
          // biome-ignore lint/suspicious/noConsole: Error logging
          console.error(
            `[DatabaseProvider] Error executing statement ${i + 1}/${effectiveStatements.length} in migration ${entry.tag}:`,
          );
          // biome-ignore lint/suspicious/noConsole: Error logging
          console.error(stmt);
          // biome-ignore lint/suspicious/noConsole: Error logging
          console.error(e);

          // Extra diagnostics for common schema/index issues.
          // Helps confirm whether a UNIQUE index exists even when the SQL migration file says otherwise.
          try {
            if (client.getAllAsync) {
              const isAdventuresStmt = /\b(adventures)\b/i.test(stmt);
              if (isAdventuresStmt) {
                const indexes = await client.getAllAsync?.<{ name: string; sql: string | null }>(
                  "SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='adventures' ORDER BY name",
                );
                // biome-ignore lint/suspicious/noConsole: Error logging
                console.error("[DatabaseProvider] adventures indexes:", indexes);

                const tableSql = await client.getFirstAsync?.<{ sql: string | null }>(
                  "SELECT sql FROM sqlite_master WHERE type='table' AND name='adventures' LIMIT 1",
                );
                // biome-ignore lint/suspicious/noConsole: Error logging
                console.error("[DatabaseProvider] adventures table SQL:", tableSql?.sql);
              }
            }
          } catch (_diagErr) {
            // Ignore diagnostics failures.
          }
          throw e;
        }
      }

      // Record applied migration.
      await txn.execAsync(
        `INSERT INTO __drizzle_migrations (hash, created_at) VALUES (${JSON.stringify(entry.tag)}, ${entry.when})`,
      );
    }
  };

  // Use a single connection transaction to avoid issues with `useNewConnection` transactions
  // interacting poorly with Drizzle's sync `prepareSync` on Android.
  await client.execAsync("BEGIN IMMEDIATE");
  try {
    await runEntry(client);
    await client.execAsync("COMMIT");
  } catch (e) {
    // biome-ignore lint/suspicious/noConsole: Error logging
    console.error("[DatabaseProvider] Migration failed:", e);
    await client.execAsync("ROLLBACK");
    throw e;
  }
}

interface DatabaseProviderProps {
  children: ReactNode;
  onReady?: () => void;
}

export function DatabaseProvider({ children, onReady }: DatabaseProviderProps) {
  const { t } = useTranslation();

  const migrationMaxIdx = useMemo(() => {
    // Allows quickly isolating a hanging migration on-device.
    // Examples:
    // - EXPO_PUBLIC_MIGRATION_MAX_IDX=0  -> only schema
    // - EXPO_PUBLIC_MIGRATION_MAX_IDX=1  -> schema + seed_exercises
    // Default: run all migrations.
    const raw = process.env.EXPO_PUBLIC_MIGRATION_MAX_IDX;
    const parsed = raw === undefined ? Number.POSITIVE_INFINITY : Number(raw);
    return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
  }, []);

  const migrationConfig = useMemo(() => {
    const entries = migrations.journal?.entries ?? [];
    const filteredEntries = entries.filter((e) => e.idx <= migrationMaxIdx);

    const filteredMigrations: Record<string, string> = {};
    for (const entry of filteredEntries) {
      const key = getMigrationKeyFromIdx(entry.idx);
      const sql = (migrations.migrations as Record<string, unknown> | undefined)?.[key];
      if (typeof sql === "string") filteredMigrations[key] = sql;
    }

    if (__DEV__ && process.env.EXPO_PUBLIC_MIGRATIONS_DEBUG === "1") {
      // biome-ignore lint/suspicious/noConsole: Debug logging
      console.log("[DatabaseProvider] migrationMaxIdx:", migrationMaxIdx);
      // biome-ignore lint/suspicious/noConsole: Debug logging
      console.log(
        "[DatabaseProvider] journalEntries:",
        filteredEntries.length,
        "/",
        entries.length,
      );
      // biome-ignore lint/suspicious/noConsole: Debug logging
      console.log("[DatabaseProvider] migrationKeys:", Object.keys(filteredMigrations));
      const m0000 = filteredMigrations.m0000;
      // biome-ignore lint/suspicious/noConsole: Debug logging
      console.log("[DatabaseProvider] m0000Type:", typeof m0000, "len:", m0000?.length);
      // biome-ignore lint/suspicious/noConsole: Debug logging
      console.log("[DatabaseProvider] m0000Sample:", m0000?.slice?.(0, 120));
    }

    return {
      journal: {
        ...migrations.journal,
        entries: filteredEntries,
      },
      migrations: filteredMigrations,
    };
  }, [migrationMaxIdx]);

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

    const debug = __DEV__ && process.env.EXPO_PUBLIC_MIGRATIONS_DEBUG === "1";
    const client = (db as unknown as { $client?: SqliteMigrationClient }).$client;
    if (!client) {
      setMigrationState({
        success: false,
        error: new Error("Database client not available for migrations"),
      });
      return;
    }

    (async () => {
      try {
        setMigrationState({ success: false });
        await runMigrationsAsync(client, migrationConfig, { debug });
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
  }, [migrationConfig]);

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
    } catch {
      // Error handled silently
    }

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
          backgroundColor: "$bgDark",
          padding: 20,
        }}
      >
        <Text style={{ color: "$text", fontSize: 16, fontWeight: "bold", marginBottom: 10 }}>
          {t("common.error")}:
        </Text>
        <Text style={{ color: "$warning", fontSize: 14, marginBottom: 20 }}>
          {error.message.substring(0, 200)}
          {error.message.length > 200 ? "..." : ""}
        </Text>
        <Text style={{ color: "$text", fontSize: 12, opacity: 0.7 }}>
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
          backgroundColor: "$bgDark",
        }}
      >
        <Text style={{ color: "$text", fontSize: 18, fontWeight: "700" }}>🏰 Bati</Text>
        <Text style={{ color: "$text", opacity: 0.6, marginTop: 8 }}>
          {t("splash.loading", "Building your village...")}
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}

// Hook to get db instance (for backward compatibility)
import { useCallback } from "react";
import { db as dbClient } from "@/src/db/client";

export function useDatabase() {
  return { db: dbClient };
}
