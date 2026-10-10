import {
  revealBody,
  revealColors,
  revealTitle,
  tierSentence,
} from "@/components/session/bigFeastText";
import type { Feast } from "@/components/session/feasts";
import { sentence } from "@/components/village/crestText";
import { i18n } from "@/i18n";

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));

/**
 * The big feast and the tonight cards, word for word, in the three languages the French tests
 * in big-feast.test.tsx and tonight-list.test.tsx do not reach. Each sentence is the one a native
 * speaker should read: articles, cases and genders are what these catch when a key is edited.
 */

type Reveal = Extract<Feast, { kind: "reveal" }>;
const bear: Reveal = {
  kind: "reveal",
  size: "large",
  id: "reveal-0",
  animal: "bear",
  quarters: null,
  firstEight: [
    ["strength", 5],
    ["yoga", 3],
  ],
  late: false,
};
const boar: Reveal = {
  ...bear,
  animal: "boar",
  quarters: ["strength", "run"],
  firstEight: [
    ["strength", 3],
    ["run", 3],
    ["yoga", 2],
  ],
};

const WORDS = {
  en: {
    body: "5 of your 8 sessions were strength.",
    bodyLate: "Since your 8th session. 5 of your first 8 were strength.",
    boar: "Your 8 sessions split: strength 3, endurance 3, yoga 2.",
    boarLate: "Since your 8th session. Your first 8 split: strength 3, endurance 3, yoga 2.",
    colors: "The shield's colors: strength and endurance, your two leading practices.",
    titleNamed: "A bear watches over Brumeval.",
    titleUnnamed: "A bear watches over your village.",
    kickerNamed: "Brumeval has an animal",
    kickerUnnamed: "Your village has an animal",
    t1: "Something stirs in the forest.",
    t2Bear: "A bear comes out of the forest.",
    t2Boar: "A boar bursts out of the thicket.",
    tierKicker: "New tier",
    tierLevel: "Level 20, after 118 sessions.",
    tierLevelOne: "Level 20, after 1 session.",
    tierNext: "The next tier arrives at level 25.",
    tierSentence: "Brumeval becomes a Flourishing City.",
    tierSentenceUnnamed: "Your village grows: it is now a Village.",
    join: "A stag joins the bear",
    joinBody: "39 of your 130 sessions are endurance: the stag watches too.",
    adult: "The bear is now an adult",
    venerable: "The stag is now venerable",
    stageBody: "40 strength sessions.",
    boarBody: "You mix strength and endurance.",
  },
  de: {
    body: "5 deiner 8 Einheiten waren Krafttraining.",
    bodyLate: "Seit deiner 8. Einheit. 5 deiner ersten 8 waren Krafttraining.",
    boar: "Deine 8 Einheiten verteilen sich: Kraft 3, Ausdauer 3, Yoga 2.",
    boarLate: "Seit deiner 8. Einheit. Deine ersten 8 verteilen sich: Kraft 3, Ausdauer 3, Yoga 2.",
    colors: "Die Farben des Wappens: Kraft und Ausdauer, deine zwei führenden Trainingsarten.",
    titleNamed: "Ein Bär wacht über Brumeval.",
    titleUnnamed: "Ein Bär wacht über dein Dorf.",
    kickerNamed: "Brumeval hat ein Tier",
    kickerUnnamed: "Dein Dorf hat ein Tier",
    t1: "Im Wald regt sich etwas.",
    t2Bear: "Ein Bär kommt aus dem Wald.",
    t2Boar: "Ein Wildschwein bricht aus dem Dickicht.",
    tierKicker: "Neue Ausbaustufe",
    tierLevel: "Level 20, nach 118 Einheiten.",
    tierLevelOne: "Level 20, nach 1 Einheit.",
    tierNext: "Die nächste Ausbaustufe kommt bei Level 25.",
    tierSentence: "Brumeval wird zur Blühenden Stadt.",
    tierSentenceUnnamed: "Dein Dorf wächst: Es ist jetzt ein Dorf.",
    join: "Ein Hirsch gesellt sich zum Bären",
    joinBody: "39 deiner 130 Einheiten sind Ausdauertraining: Der Hirsch wacht mit.",
    adult: "Der Bär ist jetzt erwachsen",
    venerable: "Der Hirsch ist jetzt ehrwürdig",
    stageBody: "40 Einheiten Krafttraining.",
    boarBody: "Du mischst Kraft und Ausdauer.",
  },
  es: {
    body: "5 de tus 8 sesiones fueron de fuerza.",
    bodyLate: "Desde tu 8.ª sesión. 5 de tus 8 primeras fueron de fuerza.",
    boar: "Tus 8 sesiones se reparten: fuerza 3, resistencia 3, yoga 2.",
    boarLate: "Desde tu 8.ª sesión. Tus 8 primeras se reparten: fuerza 3, resistencia 3, yoga 2.",
    colors: "Los colores del escudo: fuerza y resistencia, tus dos prácticas principales.",
    titleNamed: "Un oso vela por Brumeval.",
    titleUnnamed: "Un oso vela por tu aldea.",
    kickerNamed: "Brumeval tiene un animal",
    kickerUnnamed: "Tu aldea tiene un animal",
    t1: "Algo se mueve en el bosque.",
    t2Bear: "Un oso sale del bosque.",
    t2Boar: "Un jabalí sale de la maleza.",
    tierKicker: "Nuevo rango",
    tierLevel: "Nivel 20, tras 118 sesiones.",
    tierLevelOne: "Nivel 20, tras 1 sesión.",
    tierNext: "El próximo rango llega en el nivel 25.",
    tierSentence: "Brumeval se convierte en una Ciudad próspera.",
    tierSentenceUnnamed: "Tu aldea crece: ahora es una Aldea.",
    join: "Un ciervo se une al oso",
    joinBody: "39 de tus 130 sesiones son de resistencia: el ciervo también vela.",
    adult: "El oso ya es adulto",
    venerable: "El ciervo ya es venerable",
    stageBody: "40 sesiones de fuerza.",
    boarBody: "Mezclas fuerza y resistencia.",
  },
} as const;

afterAll(() => i18n.changeLanguage("en"));

describe.each(["en", "de", "es"] as const)("the feast copy in %s", (lang) => {
  const w = WORDS[lang];
  const t = i18n.t.bind(i18n);
  beforeAll(() => i18n.changeLanguage(lang));

  test("the reveal: bear, late, and the boar's split and colors", () => {
    expect(revealBody(t, bear)).toBe(w.body);
    expect(revealBody(t, { ...bear, late: true })).toBe(w.bodyLate);
    expect(revealBody(t, boar)).toBe(w.boar);
    expect(revealBody(t, { ...boar, late: true })).toBe(w.boarLate);
    expect(revealColors(t, boar)).toBe(w.colors);
    expect(revealColors(t, bear)).toBe("");
  });

  test("the reveal: title, kicker and storyboard lines", () => {
    expect(revealTitle(t, bear, "Brumeval")).toBe(w.titleNamed);
    expect(revealTitle(t, bear, "")).toBe(w.titleUnnamed);
    expect(t("session.feast_reveal_kicker", { name: "Brumeval" })).toBe(w.kickerNamed);
    expect(t("session.feast_reveal_kicker_unnamed")).toBe(w.kickerUnnamed);
    expect(t("session.feast_reveal_t1")).toBe(w.t1);
    expect(t("session.feast_reveal_t2_bear")).toBe(w.t2Bear);
    expect(t("session.feast_reveal_t2_boar")).toBe(w.t2Boar);
  });

  test("the tier: kicker, level line in singular and plural, next tier, sentence", () => {
    expect(t("session.feast_tier_kicker")).toBe(w.tierKicker);
    expect(t("session.feast_tier_level", { level: 20, count: 118 })).toBe(w.tierLevel);
    expect(t("session.feast_tier_level", { level: 20, count: 1 })).toBe(w.tierLevelOne);
    expect(t("session.feast_tier_next", { level: 25 })).toBe(w.tierNext);
    expect(tierSentence(t, 9, "Brumeval", lang)).toBe(w.tierSentence);
    // Tier 3 is named after the generic word: an unnamed village must not "become a Village".
    expect(tierSentence(t, 3, "", lang)).toBe(w.tierSentenceUnnamed);
  });

  test("a second animal joins, a stage rises, the boar says what it mixes", () => {
    expect(
      t("session.tonight_join", {
        second: sentence(t("village.crest_stag")),
        first: t("village.crest_to_bear"),
      }),
    ).toBe(w.join);
    expect(t("session.tonight_join_body_stag", { n: 39, total: 130 })).toBe(w.joinBody);
    const the = (a: string) => sentence(t(`village.crest_the_${a}`));
    expect(t("session.tonight_stage_adult", { animal: the("bear") })).toBe(w.adult);
    expect(t("session.tonight_stage_venerable", { animal: the("stag") })).toBe(w.venerable);
    expect(t("session.tonight_stage_body_bear", { n: 40 })).toBe(w.stageBody);
    expect(
      t("session.tonight_boar_body", {
        first: t("village.style_strength"),
        second: t("village.crest_practice_run"),
      }),
    ).toBe(w.boarBody);
  });
});
