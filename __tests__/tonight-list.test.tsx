import assert from "node:assert/strict";
import { act, render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { TamaguiProvider } from "tamagui";
import { oathText } from "@/components/oath/useOathText";
import { spoken } from "@/components/session/bigFeastText";
import { type Feast, type FeastFacts, rankFeasts } from "@/components/session/feasts";
import { TonightList } from "@/components/session/TonightList";
import { crestFootprint } from "@/components/village/crestGeometry";
import { ANIMAL_PORTRAITS } from "@/constants/animalPortraits";
import { achievementDefinitions } from "@/db/achievements";
import type { Crest as CrestRead } from "@/db/crest";
import * as crestDb from "@/db/crest";
import { NO_CREST_EVENTS } from "@/db/crestEvents";
import { i18n } from "@/i18n";
import { useSettingsStore } from "@/stores/settings";
import config from "@/tamagui.config";

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));

type Lang = "fr" | "en" | "de" | "es";
async function show(
  feasts: Feast[],
  lang: Lang = "fr",
  villageName = "Brumeval",
  crest: CrestRead | null = null,
) {
  await i18n.changeLanguage(lang);
  useSettingsStore.setState({ language: lang });
  return render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <TonightList feasts={feasts} villageName={villageName} crest={crest} />
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
  rank({ crestReveal: { animal, quarters: null, firstEight: [], late: false } });

beforeEach(() => {
  jest
    .spyOn(crestDb, "portraitOf")
    .mockImplementation(async (_crest, animal, stage) => `${animal}-${stage}`);
});
afterEach(() => jest.restoreAllMocks());

describe("TonightList reveal shield", () => {
  const crest = (second: string | null) =>
    ({
      longestFlame: 0,
      rings: 0,
      evidence: { secondFromSessions: second },
    }) as unknown as CrestRead;

  test("a boar is drawn with its quarters, like the big feast", async () => {
    const feasts = rank({
      crestReveal: { animal: "boar", quarters: ["yoga", "run"], firstEight: [], late: false },
    });
    const { getByLabelText } = await show(feasts, "en", "Brumeval", crest(null));
    expect(getByLabelText("A boar that blends yoga and endurance.")).toBeTruthy();
  });

  test("a crest still being read draws no shield, a failed read draws the one without border", async () => {
    const feasts = rank({
      crestReveal: { animal: "bear", quarters: null, firstEight: [], late: true },
    });
    await i18n.changeLanguage("en");
    useSettingsStore.setState({ language: "en" });
    const tree = (c: CrestRead | null | undefined) => (
      <TamaguiProvider config={config} defaultTheme="dark">
        <TonightList feasts={feasts} villageName="Brumeval" crest={c} />
      </TamaguiProvider>
    );
    // The line's own label also says "bear": the shield is the label that is not the sentence.
    const shield = /^(?!.*forest).*bear/i;
    const view = await render(tree(undefined));
    expect(view.queryByLabelText(shield)).toBeNull();
    // The room kept is the shield's own, 24 wide and 28 tall: the line does not jump when it lands.
    const room = StyleSheet.flatten(view.getByTestId("tonight-crest-room").props.style);
    expect(room).toMatchObject(crestFootprint(24));
    expect(crestFootprint(24)).toEqual({ width: 24, height: 28 });
    await view.rerender(tree(null));
    expect(view.getByLabelText(shield)).toBeTruthy();
    expect(view.queryByLabelText(/bear.*stag/i)).toBeNull();
    await view.rerender(tree(crest("stag")));
    expect(view.getByLabelText(/bear.*stag/i)).toBeTruthy();
  });

  test("a late reveal with a second animal is drawn with its border", async () => {
    const feasts = rank({
      crestReveal: { animal: "bear", quarters: null, firstEight: [], late: true },
    });
    const { getByLabelText } = await show(feasts, "en", "Brumeval", crest("stag"));
    expect(getByLabelText(/bear.*stag/i)).toBeTruthy();
  });
});

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
      crestReveal: { animal: "bear", quarters: null, firstEight: [], late: false },
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
    expect(getByLabelText("Pompes 14, était 12. record")).toBeTruthy();
    expect(getByLabelText("Un ours sort de la forêt et s'installe à Brumeval. après")).toBeTruthy();
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
        stageUp: [{ animal: "bear", stage: "adult", n: 40, practice: "strength" }],
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

  test("venerable; a boar, or an animal picked over a boar, counts every session", async () => {
    const feasts = rank({
      crestEvents: {
        ...NO_CREST_EVENTS,
        stageUp: [
          { animal: "stag", stage: "venerable", n: 200, practice: "run" },
          { animal: "boar", stage: "adult", n: 40, practice: null },
          { animal: "ermine", stage: "venerable", n: 200, practice: null },
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

  test("a hand-picked animal says the sessions' practice, not its own (the salmon over a bear hero)", async () => {
    const feasts = rank({
      crestEvents: {
        ...NO_CREST_EVENTS,
        stageUp: [{ animal: "salmon", stage: "adult", n: 40, practice: "strength" }],
      },
    });
    const { getByText, queryByText } = await show(feasts);
    expect(getByText("Le saumon devient adulte")).toBeTruthy();
    expect(getByText("40 séances de force.")).toBeTruthy();
    expect(queryByText(/yoga/)).toBeNull();
  });

  test("the full-screen legendary feast line says `is` when it is late and `becomes` the night it is crossed", async () => {
    const up = { animal: "bear", stage: "legendary", n: 500, practice: "strength" } as const;
    const late = await show(rank({ crestLegendary: [up] }), "en");
    expect(late.getByText("The bear is legendary")).toBeTruthy();
    await late.unmount();
    const crossed = await show(
      rank({ crestLegendary: [up], crestEvents: { ...NO_CREST_EVENTS, stageUp: [up] } }),
      "en",
    );
    expect(crossed.getByText("The bear is now legendary")).toBeTruthy();
  });

  test("a late legendary card says what is true of the hero: at least 500, not tonight", async () => {
    const feasts = rank(
      {
        crestLegendary: [{ animal: "bear", stage: "legendary", n: 500, practice: "strength" }],
      },
      { shown: [], epilogue: true },
    );
    const { getByText } = await show(feasts);
    expect(getByText("500 séances de force, et tu continues.")).toBeTruthy();
    // The event is not tonight: "est", not "devient".
    expect(getByText("L'ours est légendaire")).toBeTruthy();
  });

  test("a legendary animal demoted to a card, and the rare coat's card, in French", async () => {
    const feasts = rank(
      {
        crestEvents: {
          ...NO_CREST_EVENTS,
          stageUp: [{ animal: "ermine", stage: "legendary", n: 500, practice: "calisthenics" }],
        },
        crestLegendary: [
          { animal: "ermine", stage: "legendary", n: 500, practice: "calisthenics" },
        ],
        rareCoat: { animal: "bear", stage: "adult" },
      },
      { shown: ["legendary:calisthenics"] },
    );
    const { getByText } = await show(feasts);
    expect(getByText("L'hermine devient légendaire")).toBeTruthy();
    expect(getByText("Ta 500e séance de callisthénie, ce soir.")).toBeTruthy();
    expect(getByText("L'ours se pare de nouvelles couleurs")).toBeTruthy();
    expect(getByText("Pelage cannelle. 100 jours de flamme sur ton écu.")).toBeTruthy();
  });

  test("the rare coat's card and the demoted legendary draw their portrait, the shield when it has not shipped", async () => {
    const up = { animal: "ermine", stage: "legendary", n: 500, practice: "calisthenics" } as const;
    const withCoat = (animal: "bear" | "stag", stage: "adult" | "legendary") =>
      show(
        rank(
          {
            crestEvents: { ...NO_CREST_EVENTS, stageUp: [up] },
            crestLegendary: [up],
            rareCoat: { animal, stage },
          },
          { shown: ["legendary:calisthenics"] },
        ),
      );
    const shipped = await withCoat("bear", "adult");
    expect(
      shipped.getAllByTestId("tonight-portrait", { includeHiddenElements: true }),
    ).toHaveLength(2);
    await shipped.unmount();
    // A rare portrait that has not shipped: that card keeps the shield, the other its portrait.
    const table = ANIMAL_PORTRAITS as Record<string, unknown>;
    const gone = table["stag-legendary-rare"];
    delete table["stag-legendary-rare"];
    try {
      const missing = await withCoat("stag", "legendary");
      expect(
        missing.getAllByTestId("tonight-portrait", { includeHiddenElements: true }),
      ).toHaveLength(1);
    } finally {
      table["stag-legendary-rare"] = gone;
    }
  });

  test("the demoted legendary draws the portrait the crest sheet reads that night: base, rare, winter", async () => {
    const up = { animal: "bear", stage: "legendary", n: 500, practice: "strength" } as const;
    const portrait = async (slug: string) => {
      const read = jest.spyOn(crestDb, "portraitOf").mockResolvedValue(slug);
      const view = await show(
        rank(
          { crestEvents: { ...NO_CREST_EVENTS, stageUp: [up] }, crestLegendary: [up] },
          { shown: ["legendary:strength"] },
        ),
        "fr",
        "Brumeval",
        { longestFlame: 5, rings: 0 } as unknown as CrestRead,
      );
      const [art] = view.getAllByTestId("tonight-portrait", { includeHiddenElements: true });
      expect(read).toHaveBeenCalledWith({ longestFlame: 5 }, "bear", "legendary");
      await view.unmount();
      return art?.props.source;
    };
    const table = ANIMAL_PORTRAITS as Record<string, unknown>;
    for (const slug of ["bear-legendary", "bear-legendary-rare", "bear-legendary-winter"]) {
      expect(await portrait(slug)).toEqual([table[slug]]);
    }
    expect(table["bear-legendary-rare"]).not.toBe(table["bear-legendary"]);
    expect(table["bear-legendary-winter"]).not.toBe(table["bear-legendary"]);
  });

  test("a boar demoted to a card by an epilogue says what it mixes, and a single practice says nothing", async () => {
    const led = (quarters: [string, string]) =>
      show(
        rankFeasts({
          epilogue: true,
          result: {
            ...base,
            crestReveal: { animal: "boar", quarters, firstEight: [], late: false },
          } as never,
        }),
      );
    const mixed = await led(["strength", "run"]);
    expect(mixed.getByText("Un sanglier sort des fourrés et s'installe à Brumeval.")).toBeTruthy();
    expect(mixed.getByText("Tu mêles force et endurance.")).toBeTruthy();
    await mixed.unmount();

    const single = await led(["yoga", "yoga"]);
    expect(single.queryByText(/Tu mêles/)).toBeNull();
  });

  test("a tier is a line after... and a card when the epilogue holds the big place, which says nothing here", async () => {
    const feasts = rank(
      { tierUp: { oldTier: 2, newTier: 3 } as never, levelUp: { oldLevel: 4, newLevel: 5 } },
      {},
    );
    const alone = await show(feasts);
    expect(alone.getByText("Brumeval devient un Village.")).toBeTruthy();
    expect(alone.getByText("après")).toBeTruthy();
    await alone.unmount();

    // The unnamed village has no subject for "becomes": it gets the label form, with no full stop.
    const bare = await show(feasts, "fr", "");
    expect(bare.getByText("Nouveau palier : Village")).toBeTruthy();
    await bare.unmount();

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
    expect(led.queryByText("Ta campagne est terminée.")).toBeNull();
    expect(led.getByText("Niveau 5. Le village change d'allure.")).toBeTruthy();
    expect(led.queryByText("après")).toBeNull();
  });

  test.each([
    ["fr", "Nouveau palier : Village. Le village change d'allure"],
    ["en", "New tier: Village. The village takes on a new look"],
  ])(
    "a tier demoted to a card by a reveal keeps its full label when unnamed, in %s",
    async (lang, label) => {
      // The reveal takes the large place, so the tier is a medium card with no kicker above it:
      // it must say "New tier" itself.
      const feasts = rank({
        tierUp: { oldTier: 2, newTier: 3 } as never,
        crestReveal: { animal: "bear", quarters: null, firstEight: [], late: false },
      });
      expect(feasts.find((f) => f.kind === "tier")?.size).toBe("medium");
      const { getByLabelText } = await show(feasts, lang as Lang, "");
      expect(getByLabelText(label)).toBeTruthy();
    },
  );

  test("the spoken label never doubles a full stop", () => {
    expect(spoken({ title: "Brumeval devient un Village.", body: ["Niveau 5."] })).toBe(
      "Brumeval devient un Village. Niveau 5",
    );
    expect(spoken({ title: "Nouveau palier : Village" })).toBe("Nouveau palier : Village");
  });

  test("the spoken label joins with a space after a final mark, and keeps inner stops", () => {
    expect(spoken({ title: "Boss vaincu !", body: ["Golem"] })).toBe("Boss vaincu ! Golem");
    expect(spoken({ title: "Vraiment ?", body: ["Oui"] })).toBe("Vraiment ? Oui");
    expect(spoken({ title: "Attends…", body: ["Suite"] })).toBe("Attends… Suite");
    expect(spoken({ title: "Niv. 5", body: ["Niveau 5. Le village change."] })).toBe(
      "Niv. 5. Niveau 5. Le village change",
    );
    expect(spoken({ title: "Boss", body: [""] })).toBe("Boss");
    expect(spoken({ title: "Boss", body: [] })).toBe("Boss");
    expect(spoken({ title: "Nouveau palier :", body: ["Village"] })).toBe(
      "Nouveau palier : Village",
    );
  });

  test("the spoken label of a card with nothing in it is empty, not a crash", () => {
    expect(spoken({ title: "" })).toBe("");
    expect(spoken({ title: "", body: [""] })).toBe("");
    expect(spoken({ title: "", body: ["Niveau 5."] })).toBe("Niveau 5");
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
    expect(getByText("Triomphe ! Il tombe sous tes coups. +100 XP")).toBeTruthy();
    expect(getAllByText("SERMENT ACCOMPLI")).toHaveLength(1);
    // The card keeps what the old reward card said: the oath itself and its bonus.
    expect(getByText(oathText(OATH, i18n))).toBeTruthy();
    expect(getByText("+120 XP")).toBeTruthy();
  });

  // The week's bonus already went to an earlier oath: said, or the missing +250 reads as a bug.
  test("an oath kept after the week's bonus was paid says why no XP came", async () => {
    const { getByText, queryByText } = await show(rank({ fulfilledOath: OATH, oathBonusXp: 0 }));
    expect(getByText("SERMENT ACCOMPLI")).toBeTruthy();
    expect(getByText("Les 250\u00A0XP du serment sont déjà gagnés cette semaine.")).toBeTruthy();
    expect(queryByText(/^\+/)).toBeNull();
  });

  test("a boss felled by the final blow says so and pays no triumph XP", async () => {
    const { getByText, queryByText } = await show(
      rankFeasts({ boss: { name: "Golem", finalBlow: true }, result: base }),
    );
    expect(getByText("Boss vaincu !")).toBeTruthy();
    expect(getByText("Golem")).toBeTruthy();
    expect(getByText("Abattu par ton coup final !")).toBeTruthy();
    expect(queryByText(/Triomphe/)).toBeNull();
    expect(queryByText(/\+100 XP/)).toBeNull();
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
    expect(getByText("La même étape mène aussi à Lunge et Step-up.")).toBeTruthy();
  });

  test.each([
    ["fr", "Brumeval devient une Cité florissante.", "Nouveau palier : Cité florissante"],
    ["en", "Brumeval becomes a Flourishing City.", "New tier: Flourishing City"],
    ["de", "Brumeval wird zur Blühenden Stadt.", "Neue Ausbaustufe: Blühende Stadt"],
    ["es", "Brumeval se convierte en una Ciudad próspera.", "Nuevo rango: Ciudad próspera"],
  ])(
    "a tier is a sentence when named and a label when not, in %s",
    async (lang, named, unnamed) => {
      const feasts = rank({ tierUp: { oldTier: 8, newTier: 9 } as never });
      const a = await show(feasts, lang as Lang);
      expect(a.getByText(named)).toBeTruthy();
      await a.unmount();
      expect((await show(feasts, lang as Lang, "")).getByText(unnamed)).toBeTruthy();
    },
  );

  test.each(["fr", "en", "de", "es"])("every one of the 12 tiers has its sentence in %s", (lng) => {
    const t = i18n.getFixedT(lng);
    for (let tier = 1; tier <= 12; tier++) {
      const text = t(`session.tonight_tier_${tier}`, { subject: "S", tier: "T" });
      expect(text).not.toContain("tonight_tier");
      expect(text).toMatch(/^S /);
      expect(text).toMatch(/\.$/);
    }
  });

  test("an Age and an anniversary pushed down to cards keep their body", async () => {
    const age = {
      level: 50,
      source: "rung" as const,
      reachedAtLevel: 47,
      practice: null,
      movement: {
        id: 1,
        enName: "Pompe diamant",
        frName: "Pompe diamant",
        deName: "Pompe diamant",
        esName: "Pompe diamant",
      },
    };
    const feasts = rank(
      { crestReveal: { animal: "bear", quarters: null, firstEight: [], late: false } },
      { age: age as never, anniversary: { years: 2, sessions: 120, best: null } },
    );
    const { getByText } = await show(feasts);
    expect(getByText("Nouvel âge : Pompe diamant")).toBeTruthy();
    expect(
      getByText(
        "Niveau 50. Ton mouvement de ces dix niveaux, fait pour la première fois au niveau 47.",
      ),
    ).toBeTruthy();
    expect(getByText("120 séances sur les douze derniers mois.")).toBeTruthy();
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
      age: {
        level: 50,
        source: "rung",
        reachedAtLevel: 47,
        practice: null,
        movement: move("Pompe diamant"),
      },
      anniversary: { years: 2, sessions: 120, best: null },
      result: {
        ...base,
        levelUp: { oldLevel: 5, newLevel: 6 },
        standing: {
          exerciseId: 1,
          exerciseName: {
            en: "Push-ups",
            fr: "Pompes",
            de: "Pompes",
            es: "Pompes",
            ru: "Push-ups",
            zh: "Push-ups",
          },
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
    expect(getByText("Nouvel âge : Pompe diamant")).toBeTruthy();
    expect(getByText("après")).toBeTruthy();
    expect(getByText("Ton village a 2 ans.")).toBeTruthy();
    expect(getByText("120 séances sur les douze derniers mois.")).toBeTruthy();
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
      "39 deiner 130 Einheiten sind Ausdauertraining: Der Hirsch wacht mit.",
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
    ["es", "El oso ya es adulto", "40 sesiones de fuerza."],
  ])("a stage rises, in %s", async (lang, title, body) => {
    const feasts = rank({
      crestEvents: {
        ...NO_CREST_EVENTS,
        stageUp: [{ animal: "bear", stage: "adult", n: 40, practice: "strength" }],
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
    "tonight_stage_legendary",
    "tonight_stage_legendary_late",
    "tonight_coat_rare",
    "tonight_coat_rare_body",
    "tonight_boar_body",
    ...Array.from({ length: 12 }, (_, i) => `tonight_tier_${i + 1}`),
    "tonight_tier_unnamed",
    "tonight_age",
    "tonight_stage_body_any",
    "tonight_tier_body",
    "tonight_tier_plain",
    "tonight_growth",
    "tonight_record_was",
    "tonight_pair",
    "tonight_badge_after",
    "tonight_badge_record",
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
      // Only well-formed bold tags are allowed: a stray "</ b>" would print as text.
      expect(text.replace(/<\/?b>/g, "")).not.toMatch(/[<>]/);
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
      rank({ crestReveal: { animal: "bear", quarters: null, firstEight: [], late: false } }),
    );
    expect(getByLabelText(/^Un ours sort de la forêt.*Brumeval\. après$/)).toBeTruthy();
    expect(getAllByRole("image", { hidden: true })).toHaveLength(1);
    expect(StyleSheet.flatten(getByText("après").props.style).color).toBe(dark.textSecondary?.val);
    expect(StyleSheet.flatten(getByText("après").props.style).color).not.toBe(
      dark.resourceGold?.val,
    );
  });

  // Alegreya never sets a digit (DESIGN.md): a title without one is a name, with one it stays Noto.
  test("card titles are Alegreya, unless the title carries a digit", async () => {
    const family = (n: { props: { style?: unknown } }) =>
      (StyleSheet.flatten(n.props.style as never) as { fontFamily?: string }).fontFamily;
    const move = (name: string) => ({
      id: 1,
      enName: name,
      frName: name,
      deName: name,
      esName: name,
      imagePath: "squat.webp",
    });
    const named = await show(rankFeasts({ boss: { name: "Golem" }, result: base }), "en");
    expect(family(named.getByText("Boss Defeated!"))).toMatch(/Alegreya/);
    await named.unmount();
    const digit = await show(
      rank({
        newRungs: [
          { from: move("Squat"), next: move("Squat 2"), alsoNext: [], metTarget: 3 } as never,
        ],
      }),
      "en",
    );
    expect(family(digit.getByText("Squat 2"))).not.toMatch(/Alegreya/);
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
