import { render } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";

import { rankFeasts } from "@/components/session/feasts";
import { TonightList } from "@/components/session/TonightList";
import { achievementDefinitions } from "@/db/achievements";
import { NO_CREST_EVENTS } from "@/db/crestEvents";
import { useSettingsStore } from "@/stores/settings";
import config from "@/tamagui.config";

/**
 * `05f0445e` turned `AchievementDefinition.icon` from an emoji glyph into an icon *code*
 * ("Target", "crown") and routed the journal shelf and both village views through
 * `AchievementIcon`. The victory screen was the fourth reader and nobody looked: it kept
 * `<Text>{a.definition.icon}</Text>`, so the payoff card announced a new trophy and then drew
 * the word "Target" underneath it.
 *
 * Asserts what the hero reads, not which component was mounted: no icon code ever reaches the
 * screen as text.
 */

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));

const codes = ["first_workout", "streak_3", "xp_100"] as const;
const definitions = codes.map((code) => {
  const def = achievementDefinitions.find((d) => d.code === code);
  if (!def) throw new Error(`missing achievement definition: ${code}`);
  return def;
});

const result = {
  levelUp: null,
  tierUp: null,
  villageGrowth: [],
  newRecords: [],
  standing: null,
  newRungs: [],
  newAchievements: definitions.map((definition) => ({ code: definition.code, definition })),
  fulfilledOath: null,
  oathBonusXp: 0,
  crestEvents: NO_CREST_EVENTS,
  crestReveal: null,
};

function renderTonight(language: "en" | "fr") {
  useSettingsStore.setState({ language });
  return render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <TonightList feasts={rankFeasts({ result: result as never })} villageName="" />
    </TamaguiProvider>,
  );
}

describe("TonightList achievement icons", () => {
  it.each(["en", "fr"] as const)("draws the glyph, never the icon code (%s)", async (language) => {
    const { queryByText, getByText } = await renderTonight(language);

    // The card really mounted, otherwise the absence below proves nothing.
    for (const def of definitions) {
      expect(getByText(language === "fr" ? def.frTitle : def.enTitle)).toBeTruthy();
    }

    // Every code in the table, not only the three shown: the fixture picks three, the shelf
    // holds twenty-five, and a regression would break on whichever one it renders first.
    for (const { icon } of achievementDefinitions) {
      expect(queryByText(icon)).toBeNull();
    }
  });
});
