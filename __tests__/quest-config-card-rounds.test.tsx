import { fireEvent, render, screen } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";
import { QuestConfigCard } from "@/components/quests/QuestConfigCard";
import { Difficulty } from "@/db";
import type { Quest } from "@/db/quests";
import config from "@/tamagui.config";

/**
 * A light week takes a round off the quest (db/lightWeek). The stepper must keep showing, and
 * writing from, the hero's own rounds: pressing "-" on the lightened figure saved "lightened
 * minus one" into the quest, where it outlived the week.
 */

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string, o?: { label?: string }) => (o?.label ? `${k}:${o.label}` : k),
  }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));

const slot = (id: number) => ({
  id,
  exercise: { id, enName: `Move ${id}`, frName: `Move ${id}`, style: "strength" },
  target: { type: "reps", value: 10 },
});
// Two rounds: the three the hero's quest has, less the week's one.
const lightened = { rounds: 2, restSeconds: 30, exercises: [slot(1), slot(2)] } as unknown as Quest;

function mount(roundsShown: number | undefined, onChange: jest.Mock) {
  return render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <QuestConfigCard
        quest={lightened}
        roundsShown={roundsShown}
        config={{ level: Difficulty.Medium }}
        language="en"
        onChange={onChange}
        onReset={jest.fn()}
        onSwap={jest.fn()}
      />
    </TamaguiProvider>,
  );
}

test("the rounds stepper reads and writes the hero's rounds, not the week's", async () => {
  const onChange = jest.fn();
  await mount(3, onChange);
  await fireEvent.press(screen.getByLabelText("quests.config_title"));
  expect(screen.getByText("3")).toBeTruthy();
  await fireEvent.press(screen.getByLabelText("common.decrease:quests.config_rounds"));
  expect(onChange).toHaveBeenCalledWith({ level: Difficulty.Medium, rounds: 2 });
});

test("without a light week it shows the quest's own rounds", async () => {
  const onChange = jest.fn();
  await mount(undefined, onChange);
  await fireEvent.press(screen.getByLabelText("quests.config_title"));
  await fireEvent.press(screen.getByLabelText("common.decrease:quests.config_rounds"));
  expect(onChange).toHaveBeenCalledWith({ level: Difficulty.Medium, rounds: 1 });
});
