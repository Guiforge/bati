import { render } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";

import { VillageDetailSheet } from "@/components/village/VillageDetailSheet";
import { muscleCodes } from "@/db/schema";
import type { VillageBuilding } from "@/db/village";
import { i18n } from "@/i18n";
import config from "@/tamagui.config";

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/db/adventures", () => ({ listFinishedRunSummaries: jest.fn().mockResolvedValue([]) }));
jest.mock("@/db/completed", () => ({
  getRecentContributingSessions: jest.fn().mockResolvedValue([]),
}));

type Lang = "fr" | "en" | "de" | "es";
const LANGS: Lang[] = ["fr", "en", "de", "es"];

const unbuilt = (over: Record<string, unknown>) =>
  ({
    code: "forge",
    emoji: "🏠",
    tier: 1,
    level: 0,
    enName: "forge-en",
    frName: "forge-fr",
    unlockCondition: "default",
    relatedMuscle: "chest",
    driver: "muscle",
    metricValue: 0,
    nextTarget: 100,
    ...over,
  }) as unknown as VillageBuilding;

async function lineOf(building: VillageBuilding, language: Lang, match: RegExp) {
  await i18n.changeLanguage(language);
  const sheet = await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <VillageDetailSheet
        selected={{ kind: "building", building }}
        onClose={jest.fn()}
        language={language}
        feeds={null}
        bottomInset={0}
      />
    </TamaguiProvider>,
  );
  const node = await sheet.findByText(match);
  const text = node.props.children as string;
  await sheet.unmount();
  return text;
}

const MUSCLES = muscleCodes;
const EXPECTED_MUSCLE: Record<Lang, string[]> = {
  fr: [
    "Se bâtit avec tes bras",
    "Se bâtit avec ton dos",
    "Se bâtit avec tes épaules",
    "Se bâtit avec tes pectoraux",
    "Se bâtit avec tes abdos",
    "Se bâtit avec tes jambes",
  ],
  en: [
    "Built by training your arms",
    "Built by training your back",
    "Built by training your shoulders",
    "Built by training your chest",
    "Built by training your abs",
    "Built by training your legs",
  ],
  de: [
    "Entsteht, wenn du deine Arme trainierst",
    "Entsteht, wenn du deinen Rücken trainierst",
    "Entsteht, wenn du deine Schultern trainierst",
    "Entsteht, wenn du deine Brust trainierst",
    "Entsteht, wenn du deinen Bauch trainierst",
    "Entsteht, wenn du deine Beine trainierst",
  ],
  es: [
    "Se construye con tus brazos",
    "Se construye con tu espalda",
    "Se construye con tus hombros",
    "Se construye con tu pecho",
    "Se construye con tus abdominales",
    "Se construye con tus piernas",
  ],
};
const EXPECTED_STYLE: Record<Lang, Record<string, string>> = {
  fr: {
    wizard_tower: "Se bâtit à ton premier exercice de callisthénie",
    druid_grove: "Se bâtit à ton premier exercice de yoga",
  },
  en: {
    wizard_tower: "Built by your first calisthenics exercise",
    druid_grove: "Built by your first yoga exercise",
  },
  de: {
    wizard_tower: "Entsteht mit deiner ersten Calisthenics-Übung",
    druid_grove: "Entsteht mit deiner ersten Yoga-Übung",
  },
  es: {
    wizard_tower: "Se construye con tu primer ejercicio de calistenia",
    druid_grove: "Se construye con tu primer ejercicio de yoga",
  },
};

describe("an unbuilt building says what raises it, in one voice", () => {
  test.each(LANGS)("muscle buildings in %s", async (lang) => {
    const got: string[] = [];
    for (const relatedMuscle of MUSCLES) {
      got.push(
        await lineOf(unbuilt({ relatedMuscle }), lang, /^(Se bâtit|Built|Entsteht|Se construye)/),
      );
    }
    expect(got).toEqual(EXPECTED_MUSCLE[lang]);
  });

  test.each(LANGS)("style buildings in %s", async (lang) => {
    const got: Record<string, string> = {};
    for (const code of Object.keys(EXPECTED_STYLE[lang])) {
      got[code] = await lineOf(
        unbuilt({ code, tier: 2, relatedMuscle: null, driver: "style" }),
        lang,
        /^(Se bâtit|Built|Entsteht|Se construye)/,
      );
    }
    expect(got).toEqual(EXPECTED_STYLE[lang]);
  });
});

describe("the sheet header does not say the same thing twice", () => {
  const renderSheet = async (building: VillageBuilding) => {
    await i18n.changeLanguage("fr");
    return render(
      <TamaguiProvider config={config} defaultTheme="dark">
        <VillageDetailSheet
          selected={{ kind: "building", building }}
          onClose={jest.fn()}
          language="fr"
          feeds={null}
          bottomInset={0}
        />
      </TamaguiProvider>,
    );
  };

  it("keeps only the unlock line on an unbuilt muscle building", async () => {
    const sheet = await renderSheet(unbuilt({ relatedMuscle: "arms" }));
    expect(sheet.queryAllByText("Se bâtit avec tes bras")).toHaveLength(1);
    expect(sheet.queryAllByText("Monte avec tes bras")).toHaveLength(0);
    await sheet.unmount();
  });

  it("keeps the feeds line once the building stands", async () => {
    const sheet = await renderSheet(unbuilt({ relatedMuscle: "arms", level: 1, metricValue: 40 }));
    expect(sheet.queryAllByText("Monte avec tes bras")).toHaveLength(1);
    expect(sheet.queryAllByText("Se bâtit avec tes bras")).toHaveLength(0);
    await sheet.unmount();
  });
});
