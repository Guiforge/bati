import assert from "node:assert/strict";
import { render, screen } from "@testing-library/react-native";
import { BackHandler, Dimensions } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider, Text } from "tamagui";
import { FormSheet } from "@/components/common/FormSheet";
import de from "@/locales/de.json";
import en from "@/locales/en.json";
import es from "@/locales/es.json";
import ru from "@/locales/ru.json";
import config from "@/tamagui.config";

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({ usePathname: () => "/" }));

async function mountTitle(title: string, top = 0, footer?: React.ReactNode) {
  await render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top, left: 0, right: 0, bottom: 0 },
      }}
    >
      <TamaguiProvider config={config} defaultTheme="dark">
        <FormSheet open title={title} onClose={jest.fn()} footer={footer}>
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
  // French writes "douze mots" in words, so it has no digit to test.
  it.each([
    ["ru", ru.vault.wordsTitle],
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

  it("pins a footer under the body, outside the scroll view", async () => {
    await mountTitle("Ton animal", 0, <Text>pinned</Text>);
    const tree = JSON.stringify(screen.toJSON());
    expect(tree).toContain("pinned");
    // After the scroll view's content: the footer is its sibling, not a child of it.
    expect(tree.indexOf("pinned")).toBeGreaterThan(tree.indexOf("Ton animal"));
    expect(screen.getByText("pinned")).toBeTruthy();
  });

  it("has no footer unless it is given one", async () => {
    await mountTitle("Ton animal");
    expect(screen.queryByText("pinned")).toBeNull();
  });

  it("closes on hardware back and swallows the press so the router never leaves the tab", async () => {
    const spy = jest.spyOn(BackHandler, "addEventListener");
    const onClose = jest.fn();
    await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        <TamaguiProvider config={config} defaultTheme="dark">
          <FormSheet open title="T" onClose={onClose}>
            {null}
          </FormSheet>
        </TamaguiProvider>
      </SafeAreaProvider>,
    );
    const call = spy.mock.calls.find(([name]) => name === "hardwareBackPress");
    assert(call);
    expect((call[1] as () => boolean)()).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});
