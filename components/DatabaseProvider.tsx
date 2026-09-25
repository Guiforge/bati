import * as SplashScreen from "expo-splash-screen";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import { rawColors } from "@/constants/rawColors";
import { stampDatabaseIdentity } from "@/db/backup";
import { ensureMigrations } from "@/db/migrate";
import { backupIfStaleToday } from "@/src/autoBackup";
import { clearPeerScratch, commitRestore, discardStagedImport } from "@/src/backupFiles";
import { prepareSyncAtLaunch } from "@/src/deviceSync";
import { reportError } from "@/src/reportError";
import { useRestoreStore } from "@/stores/restore";
import { useSyncStore } from "@/stores/sync";

type MigrationState = { success: false; error?: Error } | { success: true; error?: undefined };

interface DatabaseProviderProps {
  children: ReactNode;
  onReady?: () => void;
}

/** The shell every full-screen state here shares: dark, centred, no navigation out of it. */
function FullScreenNotice({ title, message }: { title: string; message: string }) {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        // Dark-only app: a cream failure screen was the one white flash PRODUCT.md forbids.
        backgroundColor: rawColors.bgDark,
        padding: 24,
      }}
    >
      <Text style={{ color: rawColors.text, fontSize: 18, fontWeight: "700", textAlign: "center" }}>
        {title}
      </Text>
      <Text
        style={{
          color: rawColors.textSecondary,
          fontSize: 14,
          marginTop: 12,
          textAlign: "center",
          lineHeight: 20,
        }}
      >
        {message}
      </Text>
    </View>
  );
}

/**
 * Plaintext a killed app leaves in the database directory: an import decrypted before its swap,
 * another device's history opened for comparison. Nothing can be staged yet at launch, and it is
 * once per process, not per mount: the root layout remounts (see `useSyncStore.claimLaunch`),
 * and a restore staged by then must survive it.
 */
let leftoversSwept = false;
function sweepLeftovers(): void {
  if (leftoversSwept) return;
  leftoversSwept = true;
  try {
    discardStagedImport();
    clearPeerScratch();
  } catch (e) {
    reportError("backup.sweep", e);
  }
}

export function DatabaseProvider({ children, onReady }: DatabaseProviderProps) {
  const { t } = useTranslation();
  const restorePhase = useRestoreStore((state) => state.phase);
  const finishRestore = useRestoreStore((state) => state.finishRestore);
  const claimCommit = useRestoreStore((state) => state.claimCommit);

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
    sweepLeftovers();

    (async () => {
      try {
        setMigrationState({ success: false });
        // The runner itself lives in db/migrate.ts, shared with the headless widget task.
        await ensureMigrations();
        // Idempotent, and cheap: it is what makes an exported snapshot recognisable as Bati's
        // on the way back in. Kept out of the migration chain so SCHEMA_VERSION stays declared
        // once, in TypeScript.
        await stampDatabaseIdentity();
        // The quietest instant this database ever has: migrations are done, identity is stamped,
        // and nothing in the React tree has queried yet — `onReady` fires on the state below.
        // `VACUUM INTO` needs exactly that, which is why it cannot live at the end of a session;
        // see src/autoBackup.ts. It never throws, so it cannot turn a backup into the
        // database-error screen, and it returns immediately on every launch but the day's first.
        await backupIfStaleToday();
        // Same quiet moment, same reason: device sync seals this device's snapshot here, and only
        // sends it once the app is up (below). Never throws, and returns at once without sync on.
        await prepareSyncAtLaunch();
        if (!cancelled) setMigrationState({ success: true });
      } catch (e) {
        if (cancelled) return;
        const err = e instanceof Error ? e : new Error(String(e));
        setMigrationState({ success: false, error: err });
      }
    })().catch((e) => reportError("db.migrate.effect", e));

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!success || hasInitialized.current) return;
    hasInitialized.current = true;
    onReady?.();
    // The network half of device sync, once per process (the store holds the claim, a ref here
    // does not survive the root layout remounting). Off the launch path: nothing waits on it.
    const sync = useSyncStore.getState();
    if (sync.claimLaunch()) {
      sync.run({ snapshotFirst: false }).catch((e) => reportError("sync.launch", e));
    }
  }, [success, onReady]);

  useEffect(() => {
    if (error) {
      SplashScreen.hideAsync().catch((e) => reportError("splash.hide", e));
    }
  }, [error]);

  // The destructive half of a restore runs here, and only here, because rendering the notice
  // below unmounts `children` first: by the time this effect fires there is nothing left that
  // could query the database the swap is about to close. Ordering by construction, not by luck.
  //
  // At most once per process, and the claim lives in the store rather than a ref because this
  // provider does not survive the notice: see `claimCommit`.
  useEffect(() => {
    if (restorePhase !== "restoring" || !claimCommit()) return;

    commitRestore()
      .then(() => finishRestore("restartRequired"))
      .catch((e) => {
        reportError("backup.commitRestore", e);
        finishRestore("failed");
      });
  }, [restorePhase, finishRestore, claimCommit]);

  if (restorePhase !== "idle") {
    return (
      <FullScreenNotice
        title={
          restorePhase === "failed" ? t("backup.restoreFailedTitle") : t("backup.restoreTitle")
        }
        message={t(`backup.phase.${restorePhase}`)}
      />
    );
  }

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
