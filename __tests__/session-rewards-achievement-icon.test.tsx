import { render } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";

import { SessionRewards } from "@/components/session/SessionRewards";
import { achievementDefinitions } from "@/db/achievements";
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
  sessionId: 1,
  xpEarned: 10,
  dailyBonusXp: 0,
  newRecords: [],
  newRungs: [],
  newAchievements: definitions.map((definition) => ({ code: definition.code, definition })),
  fulfilledOath: null,
  oathBonusXp: 0,
  overshootXp: 0,
  outing: null,
  campaign: null,
  levelUp: null,
  tierUp: false,
  villageGrowth: [],
  heroXp: { before: 0, after: 10 },
};

type RewardsResult = React.ComponentProps<typeof SessionRewards>["result"];

function renderRewards(language: "en" | "fr") {
  return render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <SessionRewards
        result={result as unknown as RewardsResult}
        language={language}
        onViewVillage={jest.fn()}
      />
    </TamaguiProvider>,
  );
}

describe("SessionRewards achievement icons", () => {
  it.each(["en", "fr"] as const)("draws the glyph, never the icon code (%s)", async (language) => {
    const { queryByText, getByText } = await renderRewards(language);

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
