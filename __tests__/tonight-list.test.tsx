import assert from "node:assert/strict";
import { act, render } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";

import { type Feast, type FeastFacts, rankFeasts } from "@/components/session/feasts";
import { TonightList } from "@/components/session/TonightList";
import { achievementDefinitions } from "@/db/achievements";
import { NO_CREST_EVENTS } from "@/db/crestEvents";
import { i18n } from "@/i18n";
import { useSettingsStore } from "@/stores/settings";
import config from "@/tamagui.config";

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));

type Lang = "fr" | "en" | "de" | "es";
async function show(feasts: Feast[], lang: Lang = "fr", villageName = "Brumeval") {
  await i18n.changeLanguage(lang);
  useSettingsStore.setState({ language: lang });
  return render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <TonightList feasts={feasts} villageName={villageName} />
    </TamaguiProvider>,
  );
}

const base: FeastFacts["result"] = {
  levelUp: null,
  tierUp: null,
  villageGrowth: [],
  newRecords: [],
  standing: null,
  newRungs: [],
  newAchievements: [],
  fulfilledOath: null,
  oathBonusXp: 0,
  crestEvents: NO_CREST_EVENTS,
};
const rank = (over: Partial<FeastFacts["result"]>, rest: Omit<FeastFacts, "result"> = {}) =>
  rankFeasts({ result: { ...base, ...over }, ...rest });

const reveal = (animal: "bear" | "ermine" | "salmon" | "stag" | "horse" | "boar") =>
  rank({ crestEvents: { ...NO_CREST_EVENTS, reveal: { animal, quarters: null } } });

describe("TonightList", () => {
  afterEach(async () => {
    await act(() => i18n.changeLanguage("en"));
  });

  test("an empty list renders nothing at all, not even the title", async () => {
    const { toJSON, queryByText } = await show([]);
    expect(toJSON()).toBeNull();
    expect(queryByText("CE SOIR")).toBeNull();
  });

  test("the large feast is a line with the 'after' badge, a record a line with 'record'", async () => {
    const feasts = rank({
      crestEvents: { ...NO_CREST_EVENTS, reveal: { animal: "bear", quarters: null } },
      newRecords: [
        {
          isNewRecord: true,
          recordType: "exercise_max_reps",
          newValue: 14,
          previousValue: 12,
          exerciseName: { en: "Push-ups", fr: "Pompes", de: "Liegestütze", es: "Flexiones" },
          perSide: false,
        } as never,
      ],
    });
    const { getByText, getByLabelText, queryByText } = await show(feasts);
    expect(getByText("CE SOIR")).toBeTruthy();
    expect(getByText("Un ours sort de la forêt et s'installe à Brumeval.")).toBeTruthy();
    expect(getByText("après")).toBeTruthy();
    expect(getByText("Pompes 14, était 12")).toBeTruthy();
    expect(getByText("record")).toBeTruthy();
    expect(getByLabelText("Pompes 14, était 12, record")).toBeTruthy();
    expect(
      getByLabelText("Un ours sort de la forêt et s'installe à Brumeval., après"),
    ).toBeTruthy();
    expect(queryByText(/dans ton village/)).toBeNull();
  });

  test("a village without a name is 'ton village'", async () => {
    const { getByText } = await show(reveal("bear"), "fr", "");
    expect(getByText("Un ours sort de la forêt et s'installe dans ton village.")).toBeTruthy();
  });

  test("cards: a second animal joins, a stage rises", async () => {
    const feasts = rank({
      crestEvents: {
        ...NO_CREST_EVENTS,
        secondJoins: { animal: "stag", first: "bear", n: 39, total: 130 },
        stageUp: [{ animal: "bear", stage: "adult", n: 40 }],
      },
    });
    const { getByText, queryByText } = await show(feasts);
    expect(getByText("Un cerf rejoint l'ours")).toBeTruthy();
    expect(
      getByText("39 de tes 130 séances sont des courses : le cerf veille aussi."),
    ).toBeTruthy();
    expect(getByText("L'ours devient adulte")).toBeTruthy();
    expect(getByText("40 séances de force.")).toBeTruthy();
    expect(queryByText("après")).toBeNull();
  });

  test("venerable, and a boar says no count of a practice", async () => {
    const feasts = rank({
      crestEvents: {
        ...NO_CREST_EVENTS,
        stageUp: [
          { animal: "stag", stage: "venerable", n: 200 },
          { animal: "boar", stage: "adult", n: null },
        ],
      },
    });
    const { getByText, queryByText } = await show(feasts);
    expect(getByText("Le cerf devient vénérable")).toBeTruthy();
    expect(getByText("Le sanglier devient adulte")).toBeTruthy();
    expect(queryByText(/ancien/i)).toBeNull();
  });

  test("a tier is a line after the epilogue... and a card when something else leads", async () => {
    const feasts = rank(
      { tierUp: { oldTier: 2, newTier: 3 } as never, levelUp: { oldLevel: 4, newLevel: 5 } },
      {},
    );
    const alone = await show(feasts);
    expect(alone.getByText("Nouveau palier : Village")).toBeTruthy();
    expect(alone.getByText("après")).toBeTruthy();
    await alone.unmount();

    const led = await show(
      rankFeasts({
        epilogue: true,
        result: {
          ...base,
          tierUp: { oldTier: 2, newTier: 3 } as never,
          levelUp: { oldLevel: 4, newLevel: 5 },
        } as never,
      }),
    );
    expect(led.getByText("Ta campagne est terminée.")).toBeTruthy();
    expect(led.getByText("Niveau 5. Le village change d'allure.")).toBeTruthy();
    expect(led.getAllByText("après")).toHaveLength(1);
  });

  test("a boss, an oath and a building rank are said once each", async () => {
    const feasts = rankFeasts({
      boss: { name: "Golem" },
      result: {
        ...base,
        fulfilledOath: {} as never,
        villageGrowth: [
          {
            code: "forge",
            enName: "Forge",
            frName: "Forge",
            deName: "Schmiede",
            esName: "Herrería",
            relatedMuscle: null,
            oldLevel: 5,
            newLevel: 6,
          },
        ],
      },
    });
    const { getByText, getAllByText } = await show(feasts);
    expect(getByText("Forge, rang 6")).toBeTruthy();
    expect(getByText("Boss vaincu !")).toBeTruthy();
    expect(getByText("Golem")).toBeTruthy();
    expect(getAllByText("SERMENT ACCOMPLI")).toHaveLength(1);
  });

  test("a level, a standing, a rung, an achievement, an Age and an anniversary all have a place", async () => {
    const definition = achievementDefinitions[0];
    assert(definition);
    const move = (name: string) => ({
      id: 1,
      enName: name,
      frName: name,
      deName: name,
      esName: name,
      imagePath: "squat.webp",
    });
    const feasts = rankFeasts({
      age: { name: "L'Âge de la pompe diamant" },
      anniversary: { years: 2 },
      result: {
        ...base,
        levelUp: { oldLevel: 5, newLevel: 6 },
        standing: {
          exerciseId: 1,
          exerciseName: { en: "Push-ups", fr: "Pompes", de: "Pompes", es: "Pompes" },
          type: "reps",
          perSide: false,
          value: 14,
          rank: 2,
          outOf: 10,
          scope: "recent",
        },
        newRungs: [
          { from: move("Squat"), next: move("Jump Squat"), alsoNext: [], metTarget: 3 } as never,
        ],
        newAchievements: [{ code: definition.code, definition }],
      },
    });
    const { getByText } = await show(feasts);
    expect(getByText("L'Âge de la pompe diamant")).toBeTruthy();
    expect(getByText("après")).toBeTruthy();
    expect(getByText("2 ans de village.")).toBeTruthy();
    expect(getByText(/^Niveau 6/)).toBeTruthy();
    expect(getByText(/^Pompes 14.* : 2e meilleure de tes 10 dernières$/)).toBeTruthy();
    expect(getByText("Jump Squat")).toBeTruthy();
    expect(getByText(definition.frTitle)).toBeTruthy();
  });

  const SENTENCES: Record<Lang, Record<string, string>> = {
    fr: {
      bear: "Un ours sort de la forêt et s'installe à Brumeval.",
      ermine: "Une hermine se glisse hors de la forêt et s'installe à Brumeval.",
      salmon: "Un saumon remonte la rivière et s'installe à Brumeval.",
      stag: "Un cerf sort de la forêt et s'installe à Brumeval.",
      horse: "Un cheval arrive au galop et s'installe à Brumeval.",
      boar: "Un sanglier sort des fourrés et s'installe à Brumeval.",
    },
    de: {
      bear: "Ein Bär tritt aus dem Wald und zieht in Brumeval ein.",
      ermine: "Ein Hermelin schlüpft aus dem Wald und zieht in Brumeval ein.",
      salmon: "Ein Lachs schwimmt den Fluss hinauf und zieht in Brumeval ein.",
      stag: "Ein Hirsch tritt aus dem Wald und zieht in Brumeval ein.",
      horse: "Ein Pferd kommt im Galopp und zieht in Brumeval ein.",
      boar: "Ein Wildschwein bricht aus dem Dickicht und zieht in Brumeval ein.",
    },
    en: {
      bear: "A bear comes out of the forest and settles in Brumeval.",
      ermine: "An ermine slips out of the forest and settles in Brumeval.",
      salmon: "A salmon swims upriver and settles in Brumeval.",
      stag: "A stag comes out of the forest and settles in Brumeval.",
      horse: "A horse gallops in and settles in Brumeval.",
      boar: "A boar breaks out of the thicket and settles in Brumeval.",
    },
    es: {
      bear: "Un oso sale del bosque y se instala en Brumeval.",
      ermine: "Un armiño se desliza fuera del bosque y se instala en Brumeval.",
      salmon: "Un salmón remonta el río y se instala en Brumeval.",
      stag: "Un ciervo sale del bosque y se instala en Brumeval.",
      horse: "Un caballo llega al galope y se instala en Brumeval.",
      boar: "Un jabalí sale de la maleza y se instala en Brumeval.",
    },
  };

  test.each(Object.entries(SENTENCES))("the six reveals read whole in %s", async (lang, all) => {
    for (const [animal, sentence] of Object.entries(all)) {
      const { getByText, unmount } = await show(reveal(animal as "bear"), lang as Lang);
      expect(getByText(sentence)).toBeTruthy();
      await unmount();
    }
  });

  test.each([
    [
      "de",
      "Ein Hirsch gesellt sich zum Bären",
      "39 deiner 130 Einheiten sind Läufe: der Hirsch wacht mit.",
    ],
    ["en", "A stag joins the bear", "39 of your 130 sessions are runs: the stag watches too."],
    [
      "es",
      "Un ciervo se une al oso",
      "39 de tus 130 sesiones son carreras: el ciervo también vela.",
    ],
  ])("a second animal joins, in %s", async (lang, title, body) => {
    const feasts = rank({
      crestEvents: {
        ...NO_CREST_EVENTS,
        secondJoins: { animal: "stag", first: "bear", n: 39, total: 130 },
      },
    });
    const { getByText } = await show(feasts, lang as Lang);
    expect(getByText(title)).toBeTruthy();
    expect(getByText(body)).toBeTruthy();
  });

  test.each([
    ["de", "Der Bär ist jetzt erwachsen", "40 Einheiten Krafttraining."],
    ["en", "The bear is now an adult", "40 strength sessions."],
    ["es", "El oso es ahora adulto", "40 sesiones de fuerza."],
  ])("a stage rises, in %s", async (lang, title, body) => {
    const feasts = rank({
      crestEvents: { ...NO_CREST_EVENTS, stageUp: [{ animal: "bear", stage: "adult", n: 40 }] },
    });
    const { getByText } = await show(feasts, lang as Lang);
    expect(getByText(title)).toBeTruthy();
    expect(getByText(body)).toBeTruthy();
  });
});

describe("the Tonight copy, in every language", () => {
  const BANNED =
    /gardien|guardian|wächter|guardián|totem|lignée|chef|meuble|besant|annelet|écartelé|ancien|—|’/i;
  // No reps to do anywhere: a count of what was done is fine, an instruction is not.
  const REPS = /\breps?\b|répétitions|wiederholungen|repeticiones/i;
  const ANIMALS = ["bear", "ermine", "salmon", "stag", "horse", "boar"];
  const KEYS = [
    "tonight_title",
    "tonight_place_named",
    "tonight_place_unnamed",
    "tonight_join",
    "tonight_stage_adult",
    "tonight_stage_venerable",
    "tonight_boar_body",
    "tonight_tier_title",
    "tonight_tier_body",
    "tonight_tier_plain",
    "tonight_growth",
    "tonight_record_was",
    "tonight_pair",
    "tonight_badge_after",
    "tonight_badge_record",
    "tonight_epilogue",
    "tonight_anniversary_one",
    "tonight_anniversary_other",
    ...ANIMALS.map((a) => `tonight_reveal_${a}`),
    ...ANIMALS.slice(0, 5).flatMap((a) => [`tonight_join_body_${a}`, `tonight_stage_body_${a}`]),
  ].map((k) => `session.${k}`);
  const VILLAGE = ANIMALS.flatMap((a) => [`village.crest_the_${a}`, `village.crest_to_${a}`]);

  it.each(["fr", "en", "de", "es"])("%s has them all, clean", (lng) => {
    const t = i18n.getFixedT(lng);
    for (const key of [...KEYS, ...VILLAGE]) {
      const text = t(key, { place: "x", name: "x", n: 1, total: 1, tier: "x", level: 1, count: 1 });
      expect(text).not.toBe(key);
      expect(text).not.toMatch(BANNED);
      expect(text).not.toMatch(REPS);
    }
  });
});
