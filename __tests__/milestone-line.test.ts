import { milestoneLine, victoryMilestoneLine } from "@/components/village/milestoneLine";
import type { Milestone } from "@/db/milestone";
import { muscleCodes } from "@/db/schema";
import type { VillageBuilding } from "@/db/village";
import { i18n } from "@/i18n";
import type { AppLanguage } from "@/stores/settings";

const sessions = (count: number, subject: Milestone["subject"]): Milestone => ({
  rank: 4,
  count,
  unit: "sessions",
  subject,
});
const outings = (count: number): Milestone => ({ rank: 4, count, unit: "outings", subject: null });

const say = async (
  lang: AppLanguage,
  m: Milestone,
  code: Parameters<typeof milestoneLine>[1],
  named = false,
) => {
  await i18n.changeLanguage(lang);
  return milestoneLine(m, code, i18n.t, lang, named);
};

afterAll(() => i18n.changeLanguage("en"));

describe("milestoneLine", () => {
  const cases: [AppLanguage, string[]][] = [
    [
      "fr",
      [
        "Rang 4 dans environ 3 séances de pectoraux.",
        "Rang 4 dans environ 1 séance d'abdos.",
        "Rang 4 dans environ 2 séances de yoga.",
        "Rang 4 dans environ 3 sorties.",
        "Rang 4 dans environ 1 sortie.",
        "La Forge, rang 4 dans environ 2 séances de pectoraux.",
        "Le Grand Chemin, rang 4 dans environ 3 sorties.",
      ],
    ],
    [
      "en",
      [
        "Rank 4 in about 3 chest sessions.",
        "Rank 4 in about 1 abs session.",
        "Rank 4 in about 2 yoga sessions.",
        "Rank 4 in about 3 outings.",
        "Rank 4 in about 1 outing.",
        "The Forge, rank 4 in about 2 chest sessions.",
        "The High Road, rank 4 in about 3 outings.",
      ],
    ],
    [
      "de",
      [
        "Rang 4 in etwa 3 Einheiten mit Schwerpunkt Brust.",
        "Rang 4 in etwa 1 Einheit für Bauch.",
        "Rang 4 in etwa 2 Einheiten mit Schwerpunkt Yoga.",
        "Rang 4 in etwa 3 Touren.",
        "Rang 4 in etwa 1 Tour.",
        "Die Schmiede, Rang 4 in etwa 2 Einheiten mit Schwerpunkt Brust.",
        "Die Hohe Straße, Rang 4 in etwa 3 Touren.",
      ],
    ],
    [
      "es",
      [
        "Grado 4 en unas 3 sesiones de pecho.",
        "Grado 4 en aproximadamente 1 sesión de abdominales.",
        "Grado 4 en unas 2 sesiones de yoga.",
        "Grado 4 en unas 3 salidas.",
        "Grado 4 en aproximadamente 1 salida.",
        "La Forja, grado 4 en unas 2 sesiones de pecho.",
        "El Camino Real, grado 4 en unas 3 salidas.",
      ],
    ],
  ];

  it.each(cases)(
    "says whole sentences in %s, with the plural and the elision",
    async (lang, expected) => {
      const lines = [
        await say(lang, sessions(3, { muscle: "chest" }), "forge"),
        await say(lang, sessions(1, { muscle: "abs" }), "well"),
        await say(lang, sessions(2, { style: "yoga" }), "druid_grove"),
        await say(lang, outings(3), "high_road"),
        await say(lang, outings(1), "high_road"),
        await say(lang, sessions(2, { muscle: "chest" }), "forge", true),
        await say(lang, outings(3), "high_road", true),
      ];
      expect(lines).toEqual(expected);
    },
  );

  it("never mentions a number of reps to do", async () => {
    for (const lang of ["fr", "en", "de", "es"] as const) {
      const line = await say(lang, sessions(3, { muscle: "chest" }), "forge");
      expect(line).not.toMatch(/\b(reps?|wdh|répétitions)\b/i);
    }
  });
});

describe("victoryMilestoneLine", () => {
  const feeds = { muscle: { chest: [100] }, style: {}, outing: [] };
  const forge = {
    code: "forge",
    level: 3,
    driver: "muscle",
    metricValue: 300,
    nextTarget: 600,
  } as unknown as VillageBuilding;
  const fed = { muscles: ["chest" as const], styles: [], outing: false };

  it("names the building the session fed, in rank words", async () => {
    await i18n.changeLanguage("fr");
    expect(victoryMilestoneLine([forge], feeds, fed, null, i18n.t, "fr")).toBe(
      "La Forge, rang 4 dans environ 3 séances de pectoraux.",
    );
  });

  it("falls back to the Village's pick when the session fed nothing estimable", async () => {
    await i18n.changeLanguage("en");
    const nothing = { muscles: [], styles: [], outing: false };
    expect(victoryMilestoneLine([forge], feeds, nothing, forge, i18n.t, "en")).toBe(
      "The Forge, rank 4 in about 3 chest sessions.",
    );
    expect(victoryMilestoneLine([forge], feeds, nothing, null, i18n.t, "en")).toBeNull();
  });
});

describe("milestoneLine, every muscle", () => {
  it("says the singular attributive in English", async () => {
    const said = [];
    for (const muscle of muscleCodes) said.push(await say("en", sessions(3, { muscle }), "forge"));
    expect(said).toEqual([
      "Rank 4 in about 3 arm sessions.",
      "Rank 4 in about 3 back sessions.",
      "Rank 4 in about 3 shoulder sessions.",
      "Rank 4 in about 3 chest sessions.",
      "Rank 4 in about 3 abs sessions.",
      "Rank 4 in about 3 leg sessions.",
    ]);
  });

  it.each([
    ["fr", "séances de bras", "séances de jambes"],
    ["de", "Einheiten mit Schwerpunkt Arme", "Einheiten mit Schwerpunkt Beine"],
    ["es", "sesiones de brazos", "sesiones de piernas"],
  ] as const)("leaves the plural alone in %s", async (lang, arms, legs) => {
    expect(await say(lang, sessions(3, { muscle: "arms" }), "forge")).toContain(arms);
    expect(await say(lang, sessions(3, { muscle: "legs" }), "forge")).toContain(legs);
  });
});
