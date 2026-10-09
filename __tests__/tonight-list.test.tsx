import assert from "node:assert/strict";
import { act, render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { TamaguiProvider } from "tamagui";
import { oathText } from "@/components/oath/useOathText";
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

const OATH = {
  oath: { metric: "weekly_sessions", weeklyTarget: 3 },
  target: 8,
  exerciseName: null,
} as never;

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
  crestReveal: null,
};
const rank = (over: Partial<FeastFacts["result"]>, rest: Omit<FeastFacts, "result"> = {}) =>
  rankFeasts({ result: { ...base, ...over }, ...rest });

const reveal = (animal: "bear" | "ermine" | "salmon" | "stag" | "horse" | "boar") =>
  rank({ crestReveal: { animal, quarters: null } });

describe("TonightList", () => {
  afterEach(async () => {
    await act(() => i18n.changeLanguage("en"));
  });

  // Gold means earned; the way into the village is an action, so it wears the ember like the
  // app's other links (settings, oath, stats), on a 44 dp target.
  test("'See your village' is an ember link on a 44 dp target, not gold", async () => {
    await i18n.changeLanguage("fr");
    useSettingsStore.setState({ language: "fr" });
    const view = await render(
      <TamaguiProvider config={config} defaultTheme="dark">
        <TonightList feasts={reveal("bear")} villageName="Brumeval" onViewVillage={() => {}} />
      </TamaguiProvider>,
    );
    const link = view.getByTestId("tonight-view-village");
    const style = StyleSheet.flatten(link.props.style);
    expect(style.minHeight).toBeGreaterThanOrEqual(44);
    expect(style.minWidth).toBeGreaterThanOrEqual(44);
    const dark = config.themes.dark as unknown as Record<string, { val: string }>;
    const color = StyleSheet.flatten(view.getByText("Voir ton village").props.style).color;
    expect(color).toBe(dark.primaryText?.val);
    expect(color).not.toBe(dark.resourceGold?.val);
  });

  test("an empty list renders nothing at all, not even the title", async () => {
    const { toJSON, queryByText } = await show([]);
    expect(toJSON()).toBeNull();
    expect(queryByText("CE SOIR")).toBeNull();
  });

  test("the large feast is a line with the 'after' badge, a record a line with 'record'", async () => {
    const feasts = rank({
      crestReveal: { animal: "bear", quarters: null },
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
        stageUp: [{ animal: "bear", stage: "adult", n: 40, own: true }],
      },
    });
    const { getByText, queryByText } = await show(feasts);
    expect(getByText("Un cerf rejoint l'ours")).toBeTruthy();
    expect(
      getByText("39 de tes 130 séances sont de l'endurance : le cerf veille aussi."),
    ).toBeTruthy();
    expect(getByText("L'ours devient adulte")).toBeTruthy();
    expect(getByText("40 séances de force.")).toBeTruthy();
    expect(queryByText("après")).toBeNull();
  });

  test("venerable; a boar or a hand-picked animal counts every session", async () => {
    const feasts = rank({
      crestEvents: {
        ...NO_CREST_EVENTS,
        stageUp: [
          { animal: "stag", stage: "venerable", n: 200, own: true },
          { animal: "boar", stage: "adult", n: 40, own: false },
          { animal: "ermine", stage: "venerable", n: 200, own: false },
        ],
      },
    });
    const { getByText, queryByText } = await show(feasts);
    expect(getByText("Le cerf devient vénérable")).toBeTruthy();
    expect(getByText("Le sanglier devient adulte")).toBeTruthy();
    // The stage rises exactly at its threshold: the body is that count, never "null".
    expect(getByText("200 séances d'endurance.")).toBeTruthy();
    expect(getByText("40 séances.")).toBeTruthy();
    expect(getByText("200 séances.")).toBeTruthy();
    expect(queryByText(/null|ancien/i)).toBeNull();
  });

  test("a boar demoted to a card by an epilogue says what it mixes, and a single practice says nothing", async () => {
    const led = (quarters: [string, string]) =>
      show(
        rankFeasts({
          epilogue: true,
          result: { ...base, crestReveal: { animal: "boar", quarters } } as never,
        }),
      );
    const mixed = await led(["strength", "run"]);
    expect(mixed.getByText("Un sanglier sort des fourrés et s'installe à Brumeval.")).toBeTruthy();
    expect(mixed.getByText("Tu mêles force et endurance.")).toBeTruthy();
    await mixed.unmount();

    const single = await led(["yoga", "yoga"]);
    expect(single.queryByText(/Tu mêles/)).toBeNull();
  });

  test("a tier is a line after the epilogue... and a card when something else leads", async () => {
    const feasts = rank(
      { tierUp: { oldTier: 2, newTier: 3 } as never, levelUp: { oldLevel: 4, newLevel: 5 } },
      {},
    );
    const alone = await show(feasts);
    expect(alone.getByText("Brumeval devient un Village.")).toBeTruthy();
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
        fulfilledOath: OATH,
        oathBonusXp: 120,
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
    // The card keeps what the old reward card said: the oath itself and its bonus.
    expect(getByText(oathText(OATH, i18n))).toBeTruthy();
    expect(getByText("+120 XP")).toBeTruthy();
  });

  test("a rung card keeps the other doors the step leads to", async () => {
    const m = (name: string) => ({
      id: 1,
      enName: name,
      frName: name,
      deName: name,
      esName: name,
      imagePath: "squat.webp",
    });
    const feasts = rank({
      newRungs: [
        { from: m("Squat"), next: m("Jump Squat"), alsoNext: [m("Lunge"), m("Step-up")] } as never,
      ],
    });
    const { getByText } = await show(feasts);
    expect(getByText("La même étape mène aussi à Lunge, Step-up.")).toBeTruthy();
  });

  test.each([
    ["fr", "Brumeval devient une Cité florissante.", "Ton village devient une Cité florissante."],
    ["en", "Brumeval becomes a Flourishing City.", "Your village becomes a Flourishing City."],
    ["de", "Brumeval wird zur Blühenden Stadt.", "Dein Dorf wird zur Blühenden Stadt."],
    [
      "es",
      "Brumeval se convierte en una Ciudad próspera.",
      "Tu pueblo se convierte en una Ciudad próspera.",
    ],
  ])("a tier is a whole sentence, named or not, in %s", async (lang, named, unnamed) => {
    const feasts = rank({ tierUp: { oldTier: 8, newTier: 9 } as never });
    const a = await show(feasts, lang as Lang);
    expect(a.getByText(named)).toBeTruthy();
    await a.unmount();
    expect((await show(feasts, lang as Lang, "")).getByText(unnamed)).toBeTruthy();
  });

  test.each(["fr", "en", "de", "es"])("every one of the 12 tiers has its sentence in %s", (lng) => {
    const t = i18n.getFixedT(lng);
    for (let tier = 1; tier <= 12; tier++) {
      const text = t(`session.tonight_tier_${tier}`, { subject: "S", tier: "T" });
      expect(text).not.toContain("tonight_tier");
      expect(text).toMatch(/^S /);
      expect(text).toMatch(/\.$/);
    }
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
    expect(getByText("Ton village a 2 ans.")).toBeTruthy();
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
      "39 deiner 130 Einheiten sind Ausdauer: Der Hirsch wacht mit.",
    ],
    ["en", "A stag joins the bear", "39 of your 130 sessions are endurance: the stag watches too."],
    [
      "es",
      "Un ciervo se une al oso",
      "39 de tus 130 sesiones son de resistencia: el ciervo también vela.",
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
      crestEvents: {
        ...NO_CREST_EVENTS,
        stageUp: [{ animal: "bear", stage: "adult", n: 40, own: true }],
      },
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
    ...Array.from({ length: 12 }, (_, i) => `tonight_tier_${i + 1}`),
    "tonight_tier_subject_unnamed",
    "tonight_stage_body_any",
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

describe("TonightList style", () => {
  afterEach(async () => {
    await act(() => i18n.changeLanguage("en"));
  });
  const dark = config.themes.dark as unknown as Record<string, { val: string }>;
  const weight = (node: { props: { style?: unknown } }) =>
    (StyleSheet.flatten(node.props.style as never) as { fontWeight?: string }).fontWeight;
  const record = (over: Record<string, unknown>) =>
    rank({
      newRecords: [
        {
          isNewRecord: true,
          recordType: "exercise_max_reps",
          newValue: 14,
          previousValue: 12,
          exerciseName: { en: "Push-ups", fr: "Pompes", de: "Liegestütze", es: "Flexiones" },
          perSide: false,
          ...over,
        } as never,
      ],
    });

  test("the record's name and figure are bold, what it was is not", async () => {
    const { getByText } = await show(record({}));
    expect(weight(getByText("Pompes 14"))).toBe("700");
    expect(getByText("Pompes 14, était 12")).toBeTruthy();
  });

  test("a building's rank is bold, its name is not", async () => {
    const { getByText } = await show(
      rank({
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
      }),
    );
    expect(weight(getByText("rang 6"))).toBe("700");
  });

  test("the reveal wears its animal, the badges are ash and not gold", async () => {
    const { getByLabelText, getByText, getAllByRole } = await show(
      rank({ crestReveal: { animal: "bear", quarters: null } }),
    );
    expect(getByLabelText(/^Un ours sort de la forêt.*, après$/)).toBeTruthy();
    expect(getAllByRole("image", { hidden: true })).toHaveLength(1);
    expect(StyleSheet.flatten(getByText("après").props.style).color).toBe(dark.textSecondary?.val);
    expect(StyleSheet.flatten(getByText("après").props.style).color).not.toBe(
      dark.resourceGold?.val,
    );
  });

  test("a first record carries its unit: reps and seconds", async () => {
    const reps = await show(record({ previousValue: null, newValue: 10 }), "en");
    expect(reps.getByText("Push-ups 10 reps")).toBeTruthy();
    await reps.unmount();
    const hold = await show(
      record({ recordType: "exercise_max_time", previousValue: null, newValue: 45 }),
      "en",
    );
    expect(hold.getByText("Push-ups 45s")).toBeTruthy();
  });
});
