// Pure half of scripts/audit-prod.mjs (the other half runs `npm audit`), so jest can test it.
type Via =
  | string
  | { source?: number; name: string; severity: string; url?: string; title?: string };
export type AuditReport = { vulnerabilities: Record<string, { via: Via[] }> };
export type Allowed = { id: string; reason: string };

const BLOCKING = new Set(["high", "critical"]);

/** The high and critical advisories (by GHSA id) in a report that the allowlist does not name. */
export function unlistedAdvisories(report: AuditReport, allowed: Allowed[]) {
  const ok = new Set(allowed.map((a) => a.id));
  const found = new Map<string, string>();
  for (const v of Object.values(report.vulnerabilities)) {
    for (const via of v.via) {
      if (typeof via === "string" || !BLOCKING.has(via.severity)) continue;
      const id = via.url?.split("/").pop() ?? `${via.name}-${via.source}`;
      if (!ok.has(id)) found.set(id, `${via.name}: ${via.title ?? ""}`.trim());
    }
  }
  return [...found].map(([id, title]) => ({ id, title })).sort((a, b) => a.id.localeCompare(b.id));
}
