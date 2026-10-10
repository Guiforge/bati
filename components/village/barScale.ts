import type { TFunction } from "i18next";
import type { BarEnd } from "@/components/common/ProgressBar";
import { formatCount } from "@/db/targets";
import type { AppLanguage } from "@/stores/settings";

/** What `ProgressBar` is given for a scale with a caption and two ends. An empty caption is no caption: nothing done is not worth a gold "0 XP done". */
export type Scale = {
  progress: number;
  caption: string;
  ends: { left: BarEnd; right: BarEnd };
};

export const percent = (value: number, from: number, to: number) =>
  to > from ? Math.max(0, Math.min(100, ((value - from) / (to - from)) * 100)) : 0;

/**
 * "320 XP done" before the middle, "only 410 XP to go" from it: a bar that has barely moved is
 * proud of what it did, and one that nearly finished says how little is left. Both read the same
 * span, between the two ends.
 */
export function xpScale(
  t: TFunction,
  language: AppLanguage,
  p: { fromLevel: number; fromXp: number; toLevel: number; toXp: number; totalXp: number },
): Scale {
  const xp = (n: number) => formatCount(language, n);
  const done = Math.max(0, p.totalXp - p.fromXp);
  const left = Math.max(0, p.toXp - p.totalXp);
  const pastHalf = done * 2 >= p.toXp - p.fromXp;
  return {
    progress: percent(p.totalXp, p.fromXp, p.toXp),
    caption:
      done === 0
        ? ""
        : pastHalf
          ? t("village.bar_xp_left", { xp: xp(left) })
          : t("village.bar_xp_done", { xp: xp(done), count: done }),
    ends: {
      left: {
        lead: t("village.bar_end_level", { level: p.fromLevel }),
        value: t("village.bar_end_xp", { xp: xp(p.fromXp) }),
      },
      right: {
        lead: t("village.bar_end_level", { level: p.toLevel }),
        value: t("village.bar_end_xp", { xp: xp(p.toXp) }),
      },
    },
  };
}

/**
 * A rep building's bar: always what is done, "3,880 reps done" between "3,000 reps" and "4,000
 * reps". The next rung's figure is the end of the scale and never "120 to go": a number of reps
 * to do is a chore, and the hero already has a sentence for what is coming (`milestoneLine`).
 */
export function repsScale(
  t: TFunction,
  language: AppLanguage,
  p: { value: number; from: number; to: number },
): Scale {
  const reps = (n: number) => t("village.bar_end_reps", { n: formatCount(language, n), count: n });
  return {
    progress: percent(p.value, p.from, p.to),
    caption:
      p.value <= 0
        ? ""
        : t("village.bar_reps_done", { n: formatCount(language, p.value), count: p.value }),
    ends: { left: { value: reps(p.from) }, right: { value: reps(p.to) } },
  };
}
