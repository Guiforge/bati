import { legendaryBody, legendaryTitle } from "@/components/session/bigFeastText";
import type { Feast } from "@/components/session/feasts";
import { sentence } from "@/components/village/crestText";
import type { Practice } from "@/db/crestRules";
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
    // Every animal, with its article, in a named village and in an unnamed one.
    named: [
      "L'ours de Brumeval devient légendaire.",
      "Le cerf de Brumeval devient légendaire.",
      "Le cheval de Brumeval devient légendaire.",
      "Le saumon de Brumeval devient légendaire.",
      "L'hermine de Brumeval devient légendaire.",
      "Le sanglier de Brumeval devient légendaire.",
    ],
    unnamed: [
      "L'ours de ton village devient légendaire.",
      "Le cerf de ton village devient légendaire.",
      "Le cheval de ton village devient légendaire.",
      "Le saumon de ton village devient légendaire.",
      "L'hermine de ton village devient légendaire.",
      "Le sanglier de ton village devient légendaire.",
    ],
    vowel: "L'ours d'Aubeval devient légendaire.",
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
    coats: [
      "pointes d'argent",
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
    coatBody: "Pointes d'argent. Ta flamme a tenu 100 jours.",
  },
  en: {
    stage: "legendary",
    now: ["The bear is now legendary", "The ermine is now legendary"],
    named: [
      "The bear of Brumeval becomes legendary.",
      "The stag of Brumeval becomes legendary.",
      "The horse of Brumeval becomes legendary.",
      "The salmon of Brumeval becomes legendary.",
      "The ermine of Brumeval becomes legendary.",
      "The boar of Brumeval becomes legendary.",
    ],
    unnamed: [
      "The bear of your village becomes legendary.",
      "The stag of your village becomes legendary.",
      "The horse of your village becomes legendary.",
      "The salmon of your village becomes legendary.",
      "The ermine of your village becomes legendary.",
      "The boar of your village becomes legendary.",
    ],
    vowel: "The bear of Aubeval becomes legendary.",
    kicker: "Legendary",
    bodies: [
      "Your 500th strength session, tonight.",
      "Your 500th endurance session, tonight.",
      "Your 500th bike ride, tonight.",
      "Your 500th yoga session, tonight.",
      "Your 500th calisthenics session, tonight.",
      "Your 500th session, tonight.",
    ],
    coats: [
      "silvertip",
      "white coat",
      "black coat",
      "golden scales",
      "black fur",
      "ashen bristles",
    ],
    coatTitles: [
      "The bear shows new colors",
      "The stag shows new colors",
      "The horse shows new colors",
      "The salmon shows new colors",
      "The ermine shows new colors",
      "The boar shows new colors",
    ],
    coatBody: "Silvertip. Your flame held for 100 days.",
  },
  de: {
    stage: "legendär",
    now: ["Der Bär ist jetzt legendär", "Das Hermelin ist jetzt legendär"],
    named: [
      "Der Bär von Brumeval wird legendär.",
      "Der Hirsch von Brumeval wird legendär.",
      "Das Pferd von Brumeval wird legendär.",
      "Der Lachs von Brumeval wird legendär.",
      "Das Hermelin von Brumeval wird legendär.",
      "Das Wildschwein von Brumeval wird legendär.",
    ],
    unnamed: [
      "Der Bär deines Dorfes wird legendär.",
      "Der Hirsch deines Dorfes wird legendär.",
      "Das Pferd deines Dorfes wird legendär.",
      "Der Lachs deines Dorfes wird legendär.",
      "Das Hermelin deines Dorfes wird legendär.",
      "Das Wildschwein deines Dorfes wird legendär.",
    ],
    vowel: "Der Bär von Aubeval wird legendär.",
    kicker: "Legendär",
    bodies: [
      "Deine 500. Krafteinheit, heute Abend.",
      "Deine 500. Ausdauereinheit, heute Abend.",
      "Deine 500. Radtour, heute Abend.",
      "Deine 500. Yoga-Einheit, heute Abend.",
      "Deine 500. Calisthenics-Einheit, heute Abend.",
      "Deine 500. Einheit, heute Abend.",
    ],
    coats: [
      "Silberspitzen",
      "weißes Fell",
      "schwarzes Fell",
      "goldene Schuppen",
      "schwarzes Fell",
      "aschgraue Borsten",
    ],
    coatTitles: [
      "Der Bär zeigt neue Farben",
      "Der Hirsch zeigt neue Farben",
      "Das Pferd zeigt neue Farben",
      "Der Lachs zeigt neue Farben",
      "Das Hermelin zeigt neue Farben",
      "Das Wildschwein zeigt neue Farben",
    ],
    coatBody: "Silberspitzen. Deine Flamme hat 100 Tage gehalten.",
  },
  es: {
    stage: "legendario",
    now: ["El oso ya es legendario", "El armiño ya es legendario"],
    named: [
      "El oso de Brumeval se vuelve legendario.",
      "El ciervo de Brumeval se vuelve legendario.",
      "El caballo de Brumeval se vuelve legendario.",
      "El salmón de Brumeval se vuelve legendario.",
      "El armiño de Brumeval se vuelve legendario.",
      "El jabalí de Brumeval se vuelve legendario.",
    ],
    unnamed: [
      "El oso de tu aldea se vuelve legendario.",
      "El ciervo de tu aldea se vuelve legendario.",
      "El caballo de tu aldea se vuelve legendario.",
      "El salmón de tu aldea se vuelve legendario.",
      "El armiño de tu aldea se vuelve legendario.",
      "El jabalí de tu aldea se vuelve legendario.",
    ],
    vowel: "El oso de Aubeval se vuelve legendario.",
    kicker: "Legendario",
    bodies: [
      "Tu sesión número 500 de fuerza, esta noche.",
      "Tu sesión número 500 de resistencia, esta noche.",
      "Tu salida número 500 en bici, esta noche.",
      "Tu sesión número 500 de yoga, esta noche.",
      "Tu sesión número 500 de calistenia, esta noche.",
      "Tu sesión número 500, esta noche.",
    ],
    coats: [
      "puntas de plata",
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
    coatBody: "Puntas de plata. Tu llama aguantó 100 días.",
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
};

describe.each(["fr", "en", "de", "es"] as const)("the legendary copy in %s", (lang) => {
  const w = WORDS[lang];
  const t = i18n.t.bind(i18n);
  beforeAll(() => i18n.changeLanguage(lang));

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

  test("the big feast title says the event, for each animal, named or not", () => {
    expect(ANIMALS.map((a) => legendaryTitle(t, of(a, null), "Brumeval"))).toEqual(w.named);
    expect(ANIMALS.map((a) => legendaryTitle(t, of(a, null), ""))).toEqual(w.unnamed);
    expect(sentence(t("village.crest_stage_legendary"))).toBe(w.kicker);
  });

  test("a village name that starts with a vowel is elided where the language elides", () => {
    expect(legendaryTitle(t, of("bear", null), "Aubeval")).toBe(w.vowel);
  });

  test("the big feast body is the hero's own 500th, by practice, and the boar's by session", () => {
    expect(PRACTICES_IN_ORDER.map((p) => legendaryBody(t, of("bear", p)))).toEqual(w.bodies);
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
      t("session.tonight_coat_rare_body", { coat: sentence(t("village.coat_rare_bear")) }),
    ).toBe(w.coatBody);
  });

  test("nothing glows, nothing is owed", () => {
    const all = [
      ...w.named,
      ...w.unnamed,
      ...w.bodies,
      ...ANIMALS.map((a) => t(`village.coat_rare_${a}`)),
      ...w.coatTitles,
      w.coatBody,
    ].join("\n");
    expect(all).not.toMatch(BANNED);
  });
});
