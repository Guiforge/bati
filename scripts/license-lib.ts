// Which licences keep a package out of the shipped tree. F-Droid rejects what it cannot
// redistribute, and it says so a release cycle late.
//
// This is a pattern because license-checker's own --failOn compares whole strings: "GPL-3.0" in
// its list let "GPL-3.0-only" and "GPL-3.0-or-later" through, which is how modern packages write it.
const BLOCKED = /\b[AL]?GPL|\bSSPL\b|\bBUSL\b|\bUNLICENSED\b/i;

type Report = Record<string, { licenses?: string | string[] }>;

/** A dual licence is fine when one arm is free of the list: we take that arm. */
function isBlocked(expression: string): boolean {
  if (!BLOCKED.test(expression)) return false;
  // shortcut: any AND counts as binding, so `(MIT AND OFL-1.1) OR GPL-2.0` is a false alarm; parse SPDX if one ever shows up.
  if (/\bAND\b/.test(expression)) return true;
  return expression.split(/\s+OR\s+/).every((arm) => BLOCKED.test(arm));
}

export function blockedLicenses(report: Report): string[] {
  return Object.entries(report)
    .filter(([, { licenses = [] }]) => [licenses].flat().some(isBlocked))
    .map(([name, { licenses }]) => `${name}: ${[licenses].flat().join(", ")}`);
}
