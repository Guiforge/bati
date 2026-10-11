import { fireEvent, render, screen } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";

/**
 * A veteran from before the onboarding question has no answer, and the app treats them as
 * `regular`. The first tap on the row used to write `beginner`: Easy on every quest never
 * played and the jumps out of the warm-up, for a hero who only wanted to see what the row did.
 */

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));
jest.mock("@/src/reportError", () => ({ reportError: () => {} }));
jest.mock("@/hooks/useHaptics", () => ({ useHaptics: () => ({ selection: () => {} }) }));
jest.mock("@/db/preferences", () => ({
  preferences: {
    getTrainingLevel: jest.fn(),
    setTrainingLevel: jest.fn(() => Promise.resolve()),
  },
}));

import { StartingPointRow } from "@/components/settings/StartingPointRow";
import { preferences } from "@/db/preferences";
import config from "@/tamagui.config";

const stored = jest.mocked(preferences.getTrainingLevel);
const written = jest.mocked(preferences.setTrainingLevel);

async function tapRowWith(answer: "beginner" | "regular" | null) {
  stored.mockResolvedValue(answer);
  written.mockClear();
  await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <StartingPointRow />
    </TamaguiProvider>,
  );
  await fireEvent.press(screen.getByTestId("settings-starting-point"));
}

test("the first tap of a hero who never answered writes regular, what they already live under", async () => {
  await tapRowWith(null);
  expect(written).toHaveBeenCalledWith("regular");
});

test("an answer flips to the other one", async () => {
  await tapRowWith("regular");
  expect(written).toHaveBeenCalledWith("beginner");
  await tapRowWith("beginner");
  expect(written).toHaveBeenCalledWith("regular");
});
