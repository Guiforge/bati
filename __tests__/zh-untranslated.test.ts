import en from "@/locales/en.json";
import zh from "@/locales/zh.json";

// A ratchet, like the Russian one: a Chinese string that is still the English one is copy a
// translator never finished, and `i18n-keys.test.ts` cannot see it (the key exists). The fix is to
// translate the string, never to add it to EXCEPTIONS; an entry needs a reason a reader can check.

type Leaves = Map<string, string>;

function leaves(node: unknown, trail = "", out: Leaves = new Map()): Leaves {
  if (typeof node === "string") out.set(trail, node);
  else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) leaves(v, trail ? `${trail}.${k}` : k, out);
  }
  return out;
}

/** Key -> why Chinese keeps the English text. */
const EXCEPTIONS: Record<string, string> = {
  // Names of other projects, which no one translates.
  "credits.game_icons_site": "site name",
  "credits.mr_yoga": "project name",
  "credits.everkinetic": "project name",
  "credits.workout_guide": "project name",
  "credits.openmaptiles_styles": "style names",
  "sync.pick.doorNextcloud": "product name",
  // Abbreviations zh.json already writes in Latin (XP, GPS), and Boss, which the glossary keeps.
  "adventures.kind_boss": "'BOSS' chip, glossary keeps Boss",
  "quests.gps_label": "abbreviation",
  "journal.fig_xp": "unit",
  "achievements.filter_xp": "unit",
  "share.xp": "unit",
  "oath.fulfilled_xp_bonus": "'+N XP', unit only",
  "quests.reward_xp": "'+N XP', unit only",
  "quests.reward_xp_open": "'+N XP', unit only",
  "journal.xp_progress": "'a / b XP', unit only",
  "journal.level_meta": "'a / b XP', unit only",
  "journal.moved_xp": "'+N XP', unit only",
  "village.bar_end_xp": "'N XP', unit only",
  // Developer-facing example values in a text field.
  "sync.serverPlaceholder": "example host name",
  "sync.webdavUrlPlaceholder": "example URL",
};

const stripped = (s: string) => s.replace(/\{\{[^}]*\}\}|<[^>]*>|\bBoss\b/g, "");
const NBSP = /[  ]/g;

const enLeaves = leaves(en);
const zhLeaves = leaves(zh);

describe("zh.json is translated", () => {
  it("no value equals its English one", () => {
    const same = [...zhLeaves]
      .filter(([k, v]) => enLeaves.get(k)?.replace(NBSP, " ") === v.replace(NBSP, " "))
      .map(([k]) => k)
      .filter((k) => !(k in EXCEPTIONS));
    expect(same).toEqual([]);
  });

  it("no value is Latin letters only", () => {
    const latin = [...zhLeaves]
      .filter(([, v]) => !/\p{Script=Han}/u.test(v) && /[A-Za-z]{3,}/.test(stripped(v)))
      .map(([k]) => k)
      .filter((k) => !(k in EXCEPTIONS));
    expect(latin).toEqual([]);
  });

  it("every exception still names a zh value that matches English", () => {
    const stale = Object.keys(EXCEPTIONS).filter((k) => zhLeaves.get(k) !== enLeaves.get(k));
    expect(stale).toEqual([]);
  });
});
