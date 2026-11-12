import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { NMuted } from "@/components/journal/nocturne";
import { nativeHealth } from "@/modules/bati-health";
import type { HealthPort } from "@/src/healthExport/port";
import { healthExportStatus } from "@/src/healthExport/sync";
import { reportError } from "@/src/reportError";

/**
 * One line in a session's detail: sent to Health Connect, or waiting to be. Only for what this
 * phone wrote or queued, and nothing at all where Health Connect is absent or the switch is off.
 * Words, never a colour or an icon alone, so TalkBack says the same thing.
 */
export function HealthExportLine({
  sessionUuid,
  reload,
  port = nativeHealth,
}: {
  sessionUuid: string | null;
  /** Changes when the session was reloaded (a correction): the status is read again. */
  reload: unknown;
  port?: HealthPort;
}) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<"sent" | "waiting" | null>(null);

  useEffect(() => {
    // biome-ignore lint/complexity/noVoid: the effect reads `reload` only to run again when it changes.
    void reload;
    if (!sessionUuid || !port.available()) return;
    let current = true;
    healthExportStatus(port, sessionUuid)
      .then((next) => {
        if (current) setStatus(next);
      })
      .catch((e: unknown) => reportError("healthExport.detail", e));
    return () => {
      current = false;
    };
  }, [sessionUuid, reload, port]);

  if (status === null) return null;
  return (
    <NMuted testID="journal-health-export">
      {t(status === "sent" ? "healthExport.detail_sent" : "healthExport.detail_waiting")}
    </NMuted>
  );
}
