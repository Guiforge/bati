/**
 * Boss phase thresholds (HP percentage). Each phase is a colour-tint treatment layered on the
 * boss's own painting — not four separate paintings per boss. See missing-image.md §1c.
 */
const PHASE_THRESHOLDS = [
  { minPercent: 75, phase: 1, label: "Full Power", tint: null },
  { minPercent: 50, phase: 2, label: "Wounded", tint: "rgba(219, 39, 119, 0.15)" },
  { minPercent: 25, phase: 3, label: "Critical", tint: "rgba(255, 23, 68, 0.3)" },
  { minPercent: 0, phase: 4, label: "Enraged", tint: "rgba(255, 23, 68, 0.5)" },
] as const;

export type BossPhase = 1 | 2 | 3 | 4;

export function getPhaseFromHp(hpPercent: number): BossPhase {
  for (const threshold of PHASE_THRESHOLDS) {
    if (hpPercent >= threshold.minPercent) {
      return threshold.phase;
    }
  }
  return 4;
}

/**
 * Returned as the literal union, not `string`: Tamagui's colour props only accept known token
 * or colour literals, and a widened `string` fails to typecheck at the call site.
 */
export function getPhaseTint(phase: BossPhase): (typeof PHASE_THRESHOLDS)[number]["tint"] {
  return PHASE_THRESHOLDS.find((t) => t.phase === phase)?.tint ?? null;
}

/** 0-100, clamped, and safe when a fight ships with totalHp 0. */
export function getHpPercent(currentHp: number, totalHp: number): number {
  if (totalHp <= 0) return 0;
  return Math.max(0, Math.min(100, (currentHp / totalHp) * 100));
}
