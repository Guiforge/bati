import { milestoneLine } from "@/components/village/milestoneLine";
import type { Milestone } from "@/db/milestone";
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
        "Rang 4 in etwa 3 Einheiten für Brust.",
        "Rang 4 in etwa 1 Einheit für Bauch.",
        "Rang 4 in etwa 2 Einheiten für Yoga.",
        "Rang 4 in etwa 3 Touren.",
        "Rang 4 in etwa 1 Tour.",
        "Die Schmiede, Rang 4 in etwa 2 Einheiten für Brust.",
        "Die Hohe Straße, Rang 4 in etwa 3 Touren.",
      ],
    ],
    [
      "es",
      [
        "Rango 4 en alrededor de 3 sesiones de pecho.",
        "Rango 4 en alrededor de 1 sesión de abdominales.",
        "Rango 4 en alrededor de 2 sesiones de yoga.",
        "Rango 4 en alrededor de 3 salidas.",
        "Rango 4 en alrededor de 1 salida.",
        "La Forja, rango 4 en alrededor de 2 sesiones de pecho.",
        "El Camino Real, rango 4 en alrededor de 3 salidas.",
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
