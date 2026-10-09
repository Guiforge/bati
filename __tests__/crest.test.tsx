import { render, screen } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";
import { Crest, type CrestShape } from "@/components/village/Crest";
import "@/i18n";
import { rawColors } from "@/constants/rawColors";
import config from "@/tamagui.config";

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

  it("stays within 12 SVG nodes for the worst crests, and the animal is one more node", async () => {
    for (const worst of [boar, bearStag]) {
      await mount(worst, 96);
      // Image is an expo-image over the Svg, not a node of it: 12 holds with it counted too.
      expect(svgNodes() + 1).toBeLessThanOrEqual(12);
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
    expect(inkStrokes()).toHaveLength(1);
  });

  it("names the animals in a whole sentence", async () => {
    await mount({ ...base, second: { animal: "stag", stage: "young" } }, 48);
    expect(screen.getByLabelText("A bear and a stag")).toBeTruthy();
    await mount(boar, 48);
    expect(screen.getByLabelText("A boar, strength and running, your choice")).toBeTruthy();
    await mount({ ...base, manual: true }, 24);
    expect(screen.getByLabelText("A bear, your choice")).toBeTruthy();
    expect(screen.getByRole("image", { name: "A bear, your choice" })).toBeTruthy();
  });

  it("sits on a plate on a painting", async () => {
    await mount(base, 48, true);
    expect(screen.getByRole("image", { name: "A bear" })).toBeTruthy();
    const plate = walk(screen.toJSON() as Host | null)[0];
    expect(plate?.props.style).toMatchObject({
      backgroundColor: rawColors.bgDark,
      borderColor: rawColors.glassBorder,
      borderWidth: 1,
    });
    await mount(base, 48);
    expect(walk(screen.toJSON() as Host | null)[0]?.props.style).not.toHaveProperty("borderWidth");
  });
});
