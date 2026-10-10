import { act, render, screen } from "@testing-library/react-native";
import { processColor } from "react-native";
import { TamaguiProvider } from "tamagui";
import { Crest, type CrestShape } from "@/components/village/Crest";
import { rawColors } from "@/constants/rawColors";
import { i18n } from "@/i18n";
import config from "@/tamagui.config";

// The glyph is a require()d asset, so every name would look alike: give each its own name.
jest.mock("@/hooks/useGameIcon", () => ({ useGameIcon: (name: string) => name }));

const base: CrestShape = {
  animal: "bear",
  manual: false,
  second: null,
  quarters: null,
  longestFlame: 0,
  rings: 0,
};

async function mount(crest: CrestShape | null, size: 24 | 48 | 56 | 96, onPainting = false) {
  await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <Crest crest={crest} size={size} onPainting={onPainting} />
    </TamaguiProvider>,
  );
}

type Host = { type: string; props: Record<string, unknown>; children: Host[] | null };

function walk(node: Host | Host[] | null): Host[] {
  if (node === null) return [];
  if (Array.isArray(node)) return node.flatMap(walk);
  return [node, ...walk(node.children)];
}
const svgHosts = (match: (type: string) => boolean) =>
  walk(screen.toJSON() as Host | Host[] | null).filter((n) => match(n.type));

/** Every SVG host node drawn: the Svg view, the Group react-native-svg adds, and the shapes. */
const svgNodes = () => svgHosts((t) => t.startsWith("RNSVG")).length;
const paths = () => svgHosts((t) => t === "RNSVGPath").map((n) => n.props);
const inkStrokes = () => paths().filter((p) => p.stroke !== undefined && p.stroke !== null);

const bearStag: CrestShape = {
  ...base,
  second: { animal: "stag", stage: "young" },
  longestFlame: 5,
  rings: 9,
  manual: true,
};
const boar: CrestShape = {
  ...base,
  animal: "boar",
  quarters: ["strength", "run"],
  longestFlame: 5,
  rings: 9,
  manual: true,
};

describe("Crest", () => {
  it("draws nothing without an animal", async () => {
    await mount(null, 96);
    expect(svgNodes()).toBe(0);
  });

  it("stays within 12 nodes for the worst crests, the glyph images counted too", async () => {
    for (const worst of [boar, bearStag]) {
      await mount(worst, 96);
      // Images are expo-images over the Svg, not nodes of it: 12 holds with them counted.
      expect(svgNodes() + svgHosts((t) => t.includes("ExpoImage")).length).toBeLessThanOrEqual(12);
      expect(svgNodes()).toBeGreaterThan(0);
    }
  });

  it("adds detail by size: no flame at 24, no rings under 96", async () => {
    const full = { ...base, longestFlame: 3 as const, rings: 3 };
    await mount(full, 24);
    const at24 = svgNodes();
    await mount(full, 48);
    const at48 = svgNodes();
    await mount(full, 56);
    expect(svgNodes()).toBe(at48);
    await mount(full, 96);
    // 24: view, group, shield. 48: + band + flames. 96: + pastille + rings.
    expect([at24, at48, svgNodes()]).toEqual([3, 5, 7]);
  });

  it("draws a flame band only when a flame was held, and no diamond at 24", async () => {
    await mount({ ...base, manual: true }, 24);
    expect(svgNodes()).toBe(3);
    await mount({ ...base, manual: true }, 48);
    expect(svgNodes()).toBe(4);
  });

  it("draws the rings as gold outlines on an ink pastille, never as discs", async () => {
    await mount({ ...base, rings: 3 }, 96);
    const ring = paths().find((p) => p.stroke !== undefined && p.stroke !== null);
    expect(ring).toBeDefined();
    expect(ring?.stroke).toEqual({ type: 0, payload: processColor(rawColors.resourceGold) });
    expect(ring?.fill).not.toEqual({ type: 0, payload: processColor(rawColors.resourceGold) });
  });

  it("separates two animal colours with an ink filet, and a lone animal has none", async () => {
    await mount({ ...base, second: { animal: "stag", stage: "young" } }, 48);
    expect(inkStrokes()).toHaveLength(1);
    await mount(base, 48);
    expect(inkStrokes()).toHaveLength(0);
  });

  it("gives the boar its quarters and filet cross, no border", async () => {
    await mount({ ...base, animal: "boar", quarters: ["strength", "run"] }, 48);
    // view, group, shield, second pair of quarters, cross
    expect(svgNodes()).toBe(5);
    // The cross is two filled rectangles on whole pixels, not a stroke.
    expect(inkStrokes()).toHaveLength(0);
    expect(
      paths()
        .filter((p) => p.fill !== undefined)
        .at(-1)?.d,
    ).toBeDefined();
  });

  it("draws the ermine's spot, and no other glyph", async () => {
    const glyph = () =>
      svgHosts((t) => t.includes("ExpoImage")).map(
        (n) => (n.props.source as { uri: string }[])[0]?.uri,
      );
    await mount({ ...base, animal: "ermine" }, 48);
    expect(glyph()).toEqual(["crestErmine"]);
    await mount({ ...base, animal: "bear" }, 48);
    expect(glyph()).toEqual(["crestBear"]);
  });

  it("cuts the boar's head out of its cross with a bone halo, a glyph twice, and no other animal", async () => {
    const images = () => svgHosts((t) => t.includes("ExpoImage")).length;
    await mount({ ...base, animal: "boar", quarters: ["strength", "run"] }, 96);
    expect(images()).toBe(2);
    await mount({ ...base, animal: "stag" }, 96);
    expect(images()).toBe(1);
  });

  it("reads the crest as whole sentences", async () => {
    await mount({ ...base, second: { animal: "stag", stage: "young" } }, 48);
    expect(screen.getByLabelText("A bear and a stag.")).toBeTruthy();
    await mount(boar, 48);
    expect(
      screen.getByLabelText("A boar that blends strength and endurance. It is your choice."),
    ).toBeTruthy();
    await mount({ ...base, manual: true }, 24);
    expect(screen.getByRole("image", { name: "A bear. It is your choice." })).toBeTruthy();
  });

  it("sits on a plate on a painting", async () => {
    await mount(base, 48, true);
    expect(screen.getByRole("image", { name: "A bear." })).toBeTruthy();
    const plate = walk(screen.toJSON() as Host | null)[0];
    expect(plate?.props.style).toMatchObject({
      backgroundColor: rawColors.bgDark,
      borderTopColor: rawColors.glassBorder,
      borderTopWidth: 1,
    });
    await mount(base, 48);
    expect(walk(screen.toJSON() as Host | null)[0]?.props.style).not.toHaveProperty(
      "borderTopWidth",
    );
  });
});

// Every sentence a reader can hear, whole: "une hermine" and "ein Bär" are the bugs this catches.
describe("Crest label", () => {
  const animals = ["bear", "stag", "horse", "salmon", "ermine"] as const;
  const label = async (crest: CrestShape, language: string) => {
    await act(() => i18n.changeLanguage(language));
    await mount(crest, 48);
    return (screen.getByRole("image").props as { accessibilityLabel: string }).accessibilityLabel;
  };
  const single = {
    fr: ["Un ours.", "Un cerf.", "Un cheval.", "Un saumon.", "Une hermine."],
    de: ["Ein Bär.", "Ein Hirsch.", "Ein Pferd.", "Ein Lachs.", "Ein Hermelin."],
    en: ["A bear.", "A stag.", "A horse.", "A salmon.", "An ermine."],
    es: ["Un oso.", "Un ciervo.", "Un caballo.", "Un salmón.", "Un armiño."],
  };
  const chosen = {
    fr: "C'est ton choix.",
    de: "Das ist deine Wahl.",
    en: "It is your choice.",
    es: "Es tu elección.",
  };
  const pairs = {
    fr: ["Un ours et un cerf.", "Un saumon et une hermine.", "Une hermine et un cheval."],
    de: ["Ein Bär und ein Hirsch.", "Ein Lachs und ein Hermelin.", "Ein Hermelin und ein Pferd."],
    en: ["A bear and a stag.", "A salmon and an ermine.", "An ermine and a horse."],
    es: ["Un oso y un ciervo.", "Un salmón y un armiño.", "Un armiño y un caballo."],
  };
  const boars = {
    fr: ["Un sanglier qui mêle force et endurance.", "Un sanglier qui mêle callisthénie et vélo."],
    de: [
      "Ein Wildschwein, das Kraft und Ausdauer vereint.",
      "Ein Wildschwein, das Calisthenics und Radfahren vereint.",
    ],
    en: [
      "A boar that blends strength and endurance.",
      "A boar that blends calisthenics and cycling.",
    ],
    es: ["Un jabalí que reúne fuerza y resistencia.", "Un jabalí que reúne calistenia y ciclismo."],
  };

  afterAll(() => i18n.changeLanguage("en"));

  it.each(["fr", "de", "en", "es"] as const)(
    "says every animal and pair whole in %s",
    async (lang) => {
      for (const [i, animal] of animals.entries()) {
        expect(await label({ ...base, animal }, lang)).toBe(single[lang][i]);
        expect(await label({ ...base, animal, manual: true }, lang)).toBe(
          `${single[lang][i]} ${chosen[lang]}`,
        );
      }
      const pair = (animal: CrestShape["animal"], other: "stag" | "ermine" | "horse") => ({
        ...base,
        animal,
        second: { animal: other, stage: "young" as const },
      });
      expect(await label(pair("bear", "stag"), lang)).toBe(pairs[lang][0]);
      expect(await label(pair("salmon", "ermine"), lang)).toBe(pairs[lang][1]);
      expect(await label(pair("ermine", "horse"), lang)).toBe(pairs[lang][2]);
      const boarOf = (quarters: CrestShape["quarters"]): CrestShape => ({
        ...base,
        animal: "boar",
        quarters,
      });
      expect(await label(boarOf(["strength", "run"]), lang)).toBe(boars[lang][0]);
      expect(await label(boarOf(["calisthenics", "ride"]), lang)).toBe(boars[lang][1]);
      expect(await label({ ...boarOf(["strength", "run"]), manual: true }, lang)).toBe(
        `${boars[lang][0]} ${chosen[lang]}`,
      );
      expect(await label(boarOf(["strength", "strength"]), lang)).toBe(
        { fr: "Un sanglier.", de: "Ein Wildschwein.", en: "A boar.", es: "Un jabalí." }[lang],
      );
      expect(await label({ ...base, animal: "boar" }, lang)).toBe(
        { fr: "Un sanglier.", de: "Ein Wildschwein.", en: "A boar.", es: "Un jabalí." }[lang],
      );
    },
  );
});
