import { legendaryBody, legendaryTitle } from "@/components/session/bigFeastText";
import type { Feast } from "@/components/session/feasts";
import { sentence } from "@/components/village/crestText";
import { ETERNAL_FLAME_DAYS } from "@/constants/flame";
import type { Practice } from "@/db/crestRules";
import { getFlameLevel } from "@/db/streaks";
import { i18n } from "@/i18n";

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));

/**
 * The legendary stage and the rare coat, word for word in the four languages: the gender of each
 * animal ("ein legendäres Pferd"), the nominative after "ist jetzt", and the coat names of the spec.
 */

const ANIMALS = ["bear", "stag", "horse", "salmon", "ermine", "boar"] as const;
const BANNED = /magi|brill|aura|shin|glänz|leucht|brilla|—|’|il te manque|encore \d/i;

const WORDS = {
  fr: {
    stage: "légendaire",
    now: ["L'ours devient légendaire", "L'hermine devient légendaire"],
    titles: [
      "Ton ours entre dans la légende.",
      "Ton cerf entre dans la légende.",
      "Ton cheval entre dans la légende.",
      "Ton saumon entre dans la légende.",
      "Ton hermine entre dans la légende.",
      "Ton sanglier entre dans la légende.",
    ],
    nowLate: "L'ours est légendaire",
    kicker: "Légendaire",
    // The practice's sentence, then the boar's: five practices and "every session".
    bodies: [
      "Ta 500e séance de force, ce soir.",
      "Ta 500e séance d'endurance, ce soir.",
      "Ta 500e sortie à vélo, ce soir.",
      "Ta 500e séance de yoga, ce soir.",
      "Ta 500e séance de callisthénie, ce soir.",
      "Ta 500e séance, ce soir.",
    ],
    late: [
      "500 séances de force, et tu continues.",
      "500 séances d'endurance, et tu continues.",
      "500 sorties à vélo, et tu continues.",
      "500 séances de yoga, et tu continues.",
      "500 séances de callisthénie, et tu continues.",
      "500 séances, et tu continues.",
    ],
    coats: [
      "pelage cannelle",
      "robe blanche",
      "robe noire",
      "écailles dorées",
      "pelage noir",
      "soies cendrées",
    ],
    coatTitles: [
      "L'ours se pare de nouvelles couleurs",
      "Le cerf se pare de nouvelles couleurs",
      "Le cheval se pare de nouvelles couleurs",
      "Le saumon se pare de nouvelles couleurs",
      "L'hermine se pare de nouvelles couleurs",
      "Le sanglier se pare de nouvelles couleurs",
    ],
    coatBody: "Pelage cannelle. 100 jours de flamme sur ton écu.",
  },
  en: {
    stage: "legendary",
    now: ["The bear is now legendary", "The ermine is now legendary"],
    titles: [
      "Your bear becomes a legend.",
      "Your stag becomes a legend.",
      "Your horse becomes a legend.",
      "Your salmon becomes a legend.",
      "Your ermine becomes a legend.",
      "Your boar becomes a legend.",
    ],
    nowLate: "The bear is legendary",
    kicker: "Legendary",
    bodies: [
      "Tonight: your 500th strength session.",
      "Tonight: your 500th endurance session.",
      "Tonight: your 500th bike ride.",
      "Tonight: your 500th yoga session.",
      "Tonight: your 500th calisthenics session.",
      "Tonight: your 500th session.",
    ],
    late: [
      "500 strength sessions and counting.",
      "500 endurance sessions and counting.",
      "500 bike rides and counting.",
      "500 yoga sessions and counting.",
      "500 calisthenics sessions and counting.",
      "500 sessions and counting.",
    ],
    coats: [
      "cinnamon coat",
      "white coat",
      "black coat",
      "golden scales",
      "black fur",
      "ashen bristles",
    ],
    coatTitles: [
      "The bear takes on new colors",
      "The stag takes on new colors",
      "The horse takes on new colors",
      "The salmon takes on new colors",
      "The ermine takes on new colors",
      "The boar takes on new colors",
    ],
    coatBody: "Cinnamon coat. 100 days of flame on your crest.",
  },
  de: {
    stage: "legendär",
    now: ["Der Bär ist jetzt legendär", "Das Hermelin ist jetzt legendär"],
    titles: [
      "Dein Bär wird zur Legende.",
      "Dein Hirsch wird zur Legende.",
      "Dein Pferd wird zur Legende.",
      "Dein Lachs wird zur Legende.",
      "Dein Hermelin wird zur Legende.",
      "Dein Wildschwein wird zur Legende.",
    ],
    nowLate: "Der Bär ist legendär",
    kicker: "Legendär",
    bodies: [
      "Heute Abend: deine 500. Krafteinheit.",
      "Heute Abend: deine 500. Ausdauereinheit.",
      "Heute Abend: deine 500. Radtour.",
      "Heute Abend: deine 500. Yoga-Einheit.",
      "Heute Abend: deine 500. Calisthenics-Einheit.",
      "Heute Abend: deine 500. Einheit.",
    ],
    late: [
      "500 Krafteinheiten, und du machst weiter.",
      "500 Ausdauereinheiten, und du machst weiter.",
      "500 Radtouren, und du machst weiter.",
      "500 Yoga-Einheiten, und du machst weiter.",
      "500 Calisthenics-Einheiten, und du machst weiter.",
      "500 Einheiten, und du machst weiter.",
    ],
    coats: [
      "Zimtfell",
      "weißes Fell",
      "schwarzes Fell",
      "goldene Schuppen",
      "schwarzes Fell",
      "aschgraue Borsten",
    ],
    coatTitles: [
      "Der Bär trägt neue Farben",
      "Der Hirsch trägt neue Farben",
      "Das Pferd trägt neue Farben",
      "Der Lachs trägt neue Farben",
      "Das Hermelin trägt neue Farben",
      "Das Wildschwein trägt neue Farben",
    ],
    coatBody: "Zimtfell. 100 Tage Flamme auf deinem Wappen.",
  },
  es: {
    stage: "legendario",
    now: ["El oso ya es legendario", "El armiño ya es legendario"],
    titles: [
      "Tu oso se convierte en leyenda.",
      "Tu ciervo se convierte en leyenda.",
      "Tu caballo se convierte en leyenda.",
      "Tu salmón se convierte en leyenda.",
      "Tu armiño se convierte en leyenda.",
      "Tu jabalí se convierte en leyenda.",
    ],
    nowLate: "El oso es legendario",
    kicker: "Legendario",
    bodies: [
      "Esta noche, tu sesión de fuerza número 500.",
      "Esta noche, tu sesión de resistencia número 500.",
      "Esta noche, tu salida en bici número 500.",
      "Esta noche, tu sesión de yoga número 500.",
      "Esta noche, tu sesión de calistenia número 500.",
      "Esta noche, tu sesión número 500.",
    ],
    late: [
      "500 sesiones de fuerza, y sigues sumando.",
      "500 sesiones de resistencia, y sigues sumando.",
      "500 salidas en bici, y sigues sumando.",
      "500 sesiones de yoga, y sigues sumando.",
      "500 sesiones de calistenia, y sigues sumando.",
      "500 sesiones, y sigues sumando.",
    ],
    coats: [
      "pelaje canela",
      "pelaje blanco",
      "pelaje negro",
      "escamas doradas",
      "pelaje negro",
      "cerdas cenicientas",
    ],
    coatTitles: [
      "El oso luce nuevos colores",
      "El ciervo luce nuevos colores",
      "El caballo luce nuevos colores",
      "El salmón luce nuevos colores",
      "El armiño luce nuevos colores",
      "El jabalí luce nuevos colores",
    ],
    coatBody: "Pelaje canela. 100 días de llama en tu escudo.",
  },
} as const;

const legendary: Extract<Feast, { kind: "legendary" }> = {
  kind: "legendary",
  size: "large",
  id: "legendary-0",
  animal: "bear",
  stage: "legendary",
  n: 500,
  practice: "strength",
  late: false,
};

describe.each(["fr", "en", "de", "es"] as const)("the legendary copy in %s", (lang) => {
  const w = WORDS[lang];
  const t = i18n.t.bind(i18n);
  beforeAll(() => i18n.changeLanguage(lang));

  const lateOf = (practice: Practice | null) => ({ ...legendary, practice, late: true });
  const of = (animal: (typeof ANIMALS)[number], practice: Practice | null) => ({
    ...legendary,
    animal,
    practice,
  });
  // Stag is the endurance practice's animal ("run"), horse the bike's ("ride").
  const PRACTICES_IN_ORDER: (Practice | null)[] = [
    "strength",
    "run",
    "ride",
    "yoga",
    "calisthenics",
    null,
  ];

  test("the stage word", () => {
    expect(t("village.crest_stage_legendary")).toBe(w.stage);
  });

  test("the night's line and card, for the bear and the ermine", () => {
    const the = (a: string) => sentence(t(`village.crest_the_${a}`));
    expect([
      t("session.tonight_stage_legendary", { animal: the("bear") }),
      t("session.tonight_stage_legendary", { animal: the("ermine") }),
    ]).toEqual(w.now);
  });

  test("a late card says the state, not the event", () => {
    const the = sentence(t("village.crest_the_bear"));
    expect(t("session.tonight_stage_legendary_late", { animal: the })).toBe(w.nowLate);
  });

  test("the big feast title says the event, with the hero's own animal and no village", () => {
    expect(ANIMALS.map((a) => legendaryTitle(t, of(a, null)))).toEqual(w.titles);
    expect(sentence(t("village.crest_stage_legendary"))).toBe(w.kicker);
  });

  test("the big feast body is the hero's own 500th, by practice, and the boar's by session", () => {
    expect(PRACTICES_IN_ORDER.map((p) => legendaryBody(t, of("bear", p)))).toEqual(w.bodies);
  });

  test("a hero past 500 at the update reads a body that is true of them: at least 500", () => {
    expect(PRACTICES_IN_ORDER.map((p) => legendaryBody(t, lateOf(p)))).toEqual(w.late);
  });

  test("the six coat names are the spec's", () => {
    expect(ANIMALS.map((a) => t(`village.coat_rare_${a}`))).toEqual(w.coats);
  });

  test("the coat card: the new colors for every animal, then the coat and the 100 days", () => {
    const the = (a: string) => sentence(t(`village.crest_the_${a}`));
    expect(ANIMALS.map((a) => t("session.tonight_coat_rare", { animal: the(a) }))).toEqual(
      w.coatTitles,
    );
    expect(
      t("session.tonight_coat_rare_body", {
        coat: sentence(t("village.coat_rare_bear")),
        days: ETERNAL_FLAME_DAYS,
      }),
    ).toBe(w.coatBody);
  });

  test("the days on the coat card are the Eternal flame's own threshold", () => {
    expect(ETERNAL_FLAME_DAYS).toBe(100);
    expect(getFlameLevel(ETERNAL_FLAME_DAYS)).toBe(5);
    expect(getFlameLevel(ETERNAL_FLAME_DAYS - 1)).toBe(4);
  });

  test("nothing glows, nothing is owed", () => {
    const all = [
      ...w.titles,
      ...w.bodies,
      ...w.late,
      ...ANIMALS.map((a) => t(`village.coat_rare_${a}`)),
      ...w.coatTitles,
      w.coatBody,
    ].join("\n");
    expect(all).not.toMatch(BANNED);
  });
});
