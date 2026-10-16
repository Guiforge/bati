/**
 * One notice on Home at a time, the first present in this order (roadmap P-05). Protect and the
 * password check are not in the roadmap's list: they keep today's relative order, protect before
 * the reminder it used to silence, the password check last as the quietest line.
 *
 * A-01 "recul" and E-03 "semaine légère" insert between "sync" and "whatsNew".
 */
export const NOTICE_ORDER = [
  "recovery",
  "sync",
  "whatsNew",
  "update",
  "protect",
  "reminder",
  "passwordCheck",
] as const;

export type NoticeKind = (typeof NOTICE_ORDER)[number];

export function pickNotice(present: ReadonlySet<NoticeKind>): NoticeKind | null {
  return NOTICE_ORDER.find((kind) => present.has(kind)) ?? null;
}
