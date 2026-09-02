import { render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";
import { OutsideBand } from "@/components/home/OutsideBand";
import "@/i18n";
import config from "@/tamagui.config";

/**
 * The band exists because Home could not reach an expedition at all: `useSmartAction` follows
 * the oath's exercise chain or the muscles the last thirty days went light on, and an outing
 * carries no muscles. Asserted here is what the hero reads and where the tap goes, not that it
 * rendered — "it still renders" is what let the old four-tap hunt stand.
 */

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
  useFocusEffect: (effect: () => void) => {
    const { useEffect } = require("react");
    useEffect(effect, [effect]);
  },
}));

jest.mock("@/stores/settings", () => ({
  useSettingsStore: (selector?: (s: { language: string }) => unknown) => {
    const state = { language: "fr" };
    return selector ? selector(state) : state;
  },
}));

const mockListOutings = jest.fn();

jest.mock("@/db/outings", () => ({
  listOutings: () => mockListOutings(),
}));

function outing(id: number, frName: string, frTitle: string) {
  return {
    quest: { id, frTitle, enTitle: frTitle, imagePath: "assets/images/quests/wardens_round.jpg" },
    exercise: { id: id * 10, frName, enName: frName },
  };
}

function renderBand() {
  return render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <OutsideBand />
    </TamaguiProvider>,
  );
}

beforeEach(() => {
  mockPush.mockClear();
});

it("names the movement, so the hero can see which one is the run", async () => {
  mockListOutings.mockResolvedValue([
    outing(1, "Marche du Veilleur", "La Ronde du Veilleur"),
    outing(2, "Course du Messager", "La Parole Doit Passer"),
  ]);

  await renderBand();

  expect(await screen.findByText("Course du Messager")).toBeTruthy();
  expect(screen.getByText("Marche du Veilleur")).toBeTruthy();
  // The quest title would leave the hero tapping to find out which one they want.
  expect(screen.queryByText("La Parole Doit Passer")).toBeNull();
});

it("opens the quest rather than starting the session, so the duration is still editable", async () => {
  mockListOutings.mockResolvedValue([outing(2, "Course du Messager", "La Parole Doit Passer")]);

  await renderBand();
  await userEvent.press(await screen.findByText("Course du Messager"));

  expect(mockPush).toHaveBeenCalledWith("/quests/2");
});

it("renders nothing at all when there is no way out to offer", async () => {
  mockListOutings.mockResolvedValue([]);

  const view = await renderBand();
  // The whole subtree, not just the heading: an empty band that still reserved its height would
  // leave a gap on Home that no read is ever going to fill.
  await waitFor(() => expect(view.toJSON()).toBeNull());
});
