import { legendaryTitle, stageBody } from "@/components/session/bigFeastText";
import type { Feast } from "@/components/session/feasts";
import { sentence } from "@/components/village/crestText";
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
    legendary: [
      "un ours légendaire",
      "un cerf légendaire",
      "un cheval légendaire",
      "un saumon légendaire",
      "une hermine légendaire",
      "un sanglier légendaire",
    ],
    stage: "légendaire",
    now: ["L'ours devient légendaire", "L'hermine devient légendaire"],
    title: "Un ours légendaire veille sur Brumeval.",
    kicker: "Légendaire",
    body: "500 séances de force.",
    coats: [
      "pointes d'argent",
      "robe blanche",
      "robe noire",
      "robe dorée",
      "pelage noir",
      "soies cendrées",
    ],
    coatTitle: "L'ours porte un nouveau pelage",
    coatBody: "Pointes d'argent, grâce à ta flamme Éternelle.",
  },
  en: {
    legendary: [
      "a legendary bear",
      "a legendary stag",
      "a legendary horse",
      "a legendary salmon",
      "a legendary ermine",
      "a legendary boar",
    ],
    stage: "legendary",
    now: ["The bear is now legendary", "The ermine is now legendary"],
    title: "A legendary bear watches over Brumeval.",
    kicker: "Legendary",
    body: "500 strength sessions.",
    coats: [
      "silvertip",
      "white coat",
      "black coat",
      "golden scales",
      "black fur",
      "ashen bristles",
    ],
    coatTitle: "The bear wears a new coat",
    coatBody: "Silvertip, from your Eternal flame.",
  },
  de: {
    legendary: [
      "ein legendärer Bär",
      "ein legendärer Hirsch",
      "ein legendäres Pferd",
      "ein legendärer Lachs",
      "ein legendäres Hermelin",
      "ein legendäres Wildschwein",
    ],
    stage: "legendär",
    now: ["Der Bär ist jetzt legendär", "Das Hermelin ist jetzt legendär"],
    title: "Ein legendärer Bär wacht über Brumeval.",
    kicker: "Legendär",
    body: "500 Einheiten Krafttraining.",
    coats: [
      "Silberspitzen",
      "weißes Fell",
      "schwarzes Fell",
      "goldene Schuppen",
      "schwarzes Fell",
      "aschgraue Borsten",
    ],
    coatTitle: "Der Bär trägt ein neues Fell",
    coatBody: "Silberspitzen, von deiner ewigen Flamme.",
  },
  es: {
    legendary: [
      "un oso legendario",
      "un ciervo legendario",
      "un caballo legendario",
      "un salmón legendario",
      "un armiño legendario",
      "un jabalí legendario",
    ],
    stage: "legendario",
    now: ["El oso ya es legendario", "El armiño ya es legendario"],
    title: "Un oso legendario vela por Brumeval.",
    kicker: "Legendario",
    body: "500 sesiones de fuerza.",
    coats: [
      "puntas de plata",
      "capa blanca",
      "capa negra",
      "escamas doradas",
      "pelaje negro",
      "cerdas cenicientas",
    ],
    coatTitle: "El oso luce una capa nueva",
    coatBody: "Puntas de plata, por tu llama Eterna.",
  },
} as const;

const legendary: Extract<Feast, { kind: "legendary" }> = {
  kind: "legendary",
  size: "large",
  id: "legendary-0",
  animal: "bear",
  stage: "legendary",
  n: 500,
  own: true,
};

describe.each(["fr", "en", "de", "es"] as const)("the legendary copy in %s", (lang) => {
  const w = WORDS[lang];
  const t = i18n.t.bind(i18n);
  beforeAll(() => i18n.changeLanguage(lang));

  test("each animal, with its own gender", () => {
    expect(ANIMALS.map((a) => t(`village.crest_${a}_legendary`))).toEqual(w.legendary);
    expect(t("village.crest_stage_legendary")).toBe(w.stage);
  });

  test("the night's line and card, for the bear and the ermine", () => {
    const the = (a: string) => sentence(t(`village.crest_the_${a}`));
    expect([
      t("session.tonight_stage_legendary", { animal: the("bear") }),
      t("session.tonight_stage_legendary", { animal: the("ermine") }),
    ]).toEqual(w.now);
  });

  test("the big feast: title, kicker, and 500 of its own practice", () => {
    expect(legendaryTitle(t, legendary, "Brumeval")).toBe(w.title);
    expect(sentence(t("village.crest_stage_legendary"))).toBe(w.kicker);
    expect(stageBody(t, legendary)).toBe(w.body);
  });

  test("the six coat names are the spec's", () => {
    expect(ANIMALS.map((a) => t(`village.coat_rare_${a}`))).toEqual(w.coats);
  });

  test("the coat card names the flame, and the coat only as a label", () => {
    const the = sentence(t("village.crest_the_bear"));
    expect(t("session.tonight_coat_rare", { animal: the })).toBe(w.coatTitle);
    expect(
      t("session.tonight_coat_rare_body", { coat: sentence(t("village.coat_rare_bear")) }),
    ).toBe(w.coatBody);
  });

  test("nothing glows, nothing is owed", () => {
    const all = [
      ...ANIMALS.map((a) => t(`village.crest_${a}_legendary`)),
      ...ANIMALS.map((a) => t(`village.coat_rare_${a}`)),
      t("session.tonight_stage_legendary", { animal: "x" }),
      t("session.tonight_coat_rare", { animal: "x" }),
      t("session.tonight_coat_rare_body", { coat: "x" }),
    ].join("\n");
    expect(all).not.toMatch(BANNED);
  });
});
