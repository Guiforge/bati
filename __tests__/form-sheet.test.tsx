import { render, screen } from "@testing-library/react-native";
import { Dimensions } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";
import { FormSheet } from "@/components/common/FormSheet";
import de from "@/locales/de.json";
import en from "@/locales/en.json";
import es from "@/locales/es.json";
import fr from "@/locales/fr.json";
import config from "@/tamagui.config";

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({ usePathname: () => "/" }));

async function mountTitle(title: string, top = 0) {
  await render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top, left: 0, right: 0, bottom: 0 },
      }}
    >
      <TamaguiProvider config={config} defaultTheme="dark">
        <FormSheet open title={title} onClose={jest.fn()}>
          {null}
        </FormSheet>
      </TamaguiProvider>
    </SafeAreaProvider>,
  );
  return screen.findByText(title);
}

const style = (node: { props: { style?: unknown } }) => JSON.stringify(node.props.style);

describe("FormSheet", () => {
  it("sets its title in the heading face, like every other title", async () => {
    expect(style(await mountTitle("Ton animal"))).toMatch(/Alegreya/i);
  });

  // Alegreya's figures are old-style: a title with a digit stays in the body face.
  it.each([
    ["fr", fr.vault.wordsTitle],
    ["en", en.vault.wordsTitle],
    ["de", de.vault.wordsTitle],
    ["es", es.vault.wordsTitle],
  ])("keeps the 12 words title (%s) out of Alegreya", async (_lang, title) => {
    expect(title).toMatch(/\d/);
    expect(style(await mountTitle(title))).not.toMatch(/Alegreya/i);
  });

  it("caps the frame under the status bar, the rest scrolls", async () => {
    await mountTitle("Ton animal", 40);
    const max = JSON.stringify(screen.toJSON()).match(/"maxHeight":(\d+(?:\.\d+)?)/);
    expect(Number(max?.[1])).toBe(Dimensions.get("window").height - 40 - 16);
  });
});
