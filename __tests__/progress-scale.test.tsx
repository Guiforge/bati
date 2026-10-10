import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { TamaguiProvider } from "tamagui";
import { ProgressBar } from "@/components/common/ProgressBar";
import { repsScale, type Scale, xpScale } from "@/components/village/barScale";
import { i18n } from "@/i18n";
import config from "@/tamagui.config";

/** Narrow and non-breaking spaces read as the plain one: what is asserted is the words. */
const plain = (s: string) => s.replace(/[  ]/g, " ");

const xpAt = (totalXp: number) =>
  xpScale(i18n.t, "fr", { fromLevel: 5, fromXp: 1000, toLevel: 8, toXp: 2800, totalXp });

async function bar(scale: Scale, fontScale = 1) {
  jest.spyOn(require("react-native"), "useWindowDimensions").mockReturnValue({
    width: 360,
    height: 640,
    scale: 2,
    fontScale,
  });
  await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <ProgressBar progress={scale.progress} caption={scale.caption} ends={scale.ends} />
    </TamaguiProvider>,
  );
}
type Host = { type: string; children: (Host | string)[] | null };
function collect(node: Host | string): string[] {
  if (typeof node === "string") return [];
  if (node.type === "Text") return [plain((node.children ?? []).join(""))];
  return (node.children ?? []).flatMap(collect);
}
const texts = () => {
  const tree = screen.toJSON() as Host | Host[] | null;
  return (Array.isArray(tree) ? tree : tree ? [tree] : []).flatMap(collect);
};

beforeAll(() => i18n.changeLanguage("fr"));
afterAll(() => i18n.changeLanguage("en"));
afterEach(() => jest.restoreAllMocks());

describe("xp scale", () => {
  it("says what is done before the middle and what is left from it", () => {
    expect(plain(xpAt(1320).caption)).toBe("320 XP faits");
    // The span is 1 800: 899 done is just before the middle, 900 is the middle.
    expect(plain(xpAt(1899).caption)).toBe("899 XP faits");
    expect(plain(xpAt(1900).caption)).toBe("plus que 900 XP");
    expect(plain(xpAt(2390).caption)).toBe("plus que 410 XP");
  });

  it("is English too, and plural-safe", async () => {
    await i18n.changeLanguage("en");
    const en = xpScale(i18n.t, "en", {
      fromLevel: 5,
      fromXp: 1000,
      toLevel: 8,
      toXp: 2800,
      totalXp: 1320,
    });
    expect(en.caption).toBe("320 XP done");
    await i18n.changeLanguage("fr");
  });

  it("shows both ends, level over figure, on one line at the normal font size", async () => {
    await bar(xpAt(1320));
    expect(texts()).toEqual(["320 XP faits", "niveau 5 · 1 000 XP", "niveau 8 · 2 800 XP"]);
  });

  it("at 130 % each end takes two lines and nothing is cut", async () => {
    await bar(xpAt(1320), Math.fround(1.3));
    expect(texts()).toEqual(["320 XP faits", "niveau 5", "1 000 XP", "niveau 8", "2 800 XP"]);
  });

  it("is set in the body font, never the chronicle's", async () => {
    await bar(xpAt(1320));
    const caption = screen.getByText("320 XP faits");
    const font = StyleSheet.flatten(caption.props.style).fontFamily as string;
    expect(font).toMatch(/Noto/);
  });
});

describe("reps scale", () => {
  const reps = (value: number) => repsScale(i18n.t, "fr", { value, from: 3000, to: 4000 });

  it("always says reps done, never reps to go, even a rep from the next rung", () => {
    for (const value of [3000, 3499, 3500, 3880, 3999]) {
      expect(plain(reps(value).caption)).toBe(
        `${plain(new Intl.NumberFormat("fr").format(value))} reps faites`,
      );
    }
  });

  it("is singular for one", () => {
    expect(plain(repsScale(i18n.t, "fr", { value: 1, from: 0, to: 100 }).caption)).toBe(
      "1 rep faite",
    );
  });

  it("shows the two ends as figures with their unit", async () => {
    await bar(reps(3880));
    expect(texts()).toEqual(["3 880 reps faites", "3 000 reps", "4 000 reps"]);
  });

  it("the bar fills the span between the ends, not from zero", () => {
    expect(reps(3500).progress).toBe(50);
    expect(reps(3880).progress).toBeCloseTo(88);
  });
});
