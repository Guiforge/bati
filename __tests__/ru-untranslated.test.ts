import en from "@/locales/en.json";
import ru from "@/locales/ru.json";

// A ratchet, like the permissions test: a Russian string that is still the English one is copy a
// translator never finished, and `i18n-keys.test.ts` cannot see it (the key exists). 300 of them
// shipped after the village guardian landed. The fix is to translate the string, never to add it
// to EXCEPTIONS; an entry needs a reason a reader can check.

type Leaves = Map<string, string>;

function leaves(node: unknown, trail = "", out: Leaves = new Map()): Leaves {
  if (typeof node === "string") out.set(trail, node);
  else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) leaves(v, trail ? `${trail}.${k}` : k, out);
  }
  return out;
}

/** Key -> why Russian keeps the English text. */
const EXCEPTIONS: Record<string, string> = {
  // Names of other projects and licences, which no one translates.
  "credits.game_icons_site": "site name",
  "credits.cc_by_30": "licence name",
  "credits.cc_by_sa_40": "licence name",
  "credits.mr_yoga": "project name",
  "credits.everkinetic": "project name",
  "credits.workout_guide": "project name",
  "sync.pick.doorNextcloud": "product name",
  // Abbreviations Russian copy already writes in Latin (XP, HP, GPS).
  "boss.hp": "unit, 'HP' is what ru.json uses everywhere",
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
  // Placeholders and punctuation, no word to translate.
  "oath.card_progress": "'a / b'",
  "quests.estimate": "'≈ duration'",
  "adventures.step_title": "'step: title'",
  "session.tonight_place_unnamed": "placeholder only",
  "session.tonight_pair": "'what: detail'",
  "journal.fig_record_latest": "'name, date'",
  "journal.sr_detail": "'title, date'",
  "journal.last_blow_hold": "'movement, value'",
  "journal.day_weekday": "placeholder only",
  "journal.muscle_share": "'muscle (share)'",
  "village.crest_one": "placeholder only",
  "village.banner_label": "'year, season: fact'",
  "village.crest_legend": "placeholder only",
  "village.crest_legend_coat": "'what, coat'",
  "village.hall_times": "'×N'",
  // Developer-facing example values in a text field.
  "sync.serverPlaceholder": "example host name",
  "sync.webdavUrlPlaceholder": "example URL",
};

// en has no _few/_many: they are checked against _other.
const enKey = (k: string) => k.replace(/_(few|many)$/, "_other");
const stripped = (s: string) => s.replace(/\{\{[^}]*\}\}|<[^>]*>/g, "");
const NBSP = /[  ]/g;

const enLeaves = leaves(en);
const ruLeaves = leaves(ru);

describe("ru.json is translated", () => {
  it("no value equals its English one", () => {
    const same = [...ruLeaves]
      .filter(([k, v]) => enLeaves.get(enKey(k))?.replace(NBSP, " ") === v.replace(NBSP, " "))
      .map(([k]) => k)
      .filter((k) => !(k in EXCEPTIONS));
    expect(same).toEqual([]);
  });

  it("no value is Latin letters only", () => {
    const latin = [...ruLeaves]
      .filter(([, v]) => !/[а-яё]/i.test(v) && /[A-Za-z]{3,}/.test(stripped(v)))
      .map(([k]) => k)
      .filter((k) => !(k in EXCEPTIONS));
    expect(latin).toEqual([]);
  });

  it("every exception still names a ru value that matches English", () => {
    const stale = Object.keys(EXCEPTIONS).filter((k) => ruLeaves.get(k) !== enLeaves.get(k));
    expect(stale).toEqual([]);
  });
});
