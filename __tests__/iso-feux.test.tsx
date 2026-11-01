// L5-T03: the drawn fire over a sprite: posed with the sprite's own scale, rest pose on a cycle
// boundary, moving only by transform and opacity inside it.
import "@/i18n";
import { render, screen } from "@testing-library/react-native";
import * as Reanimated from "react-native-reanimated";
import { pose, spriteDe } from "@/components/village/iso/carteDemo";
import { Feux } from "@/components/village/iso/FeuxDessines";
import { accrochesDe, FUMEE_LARGEUR, geometrieFlamme } from "@/components/village/iso/feux";
import { CYCLE_MS, HorlogeContext } from "@/components/village/iso/horloge";
import { buildingCodes } from "@/db/schema";

jest.mock("react-native-worklets", () => ({
  ...jest.requireActual("react-native-worklets"),
  getUIRuntimeHolder: () => ({}),
}));
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({ useIsFocused: () => true }));
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => false }));

const getAnimatedStyle = Reanimated.getAnimatedStyle as unknown as (component: {
  props: Record<string, unknown>;
}) => {
  opacity?: number;
  left?: number;
  top?: number;
  transform?: Record<string, number>[];
};

// biome-ignore lint/style/useComponentExportOnlyModules: a test harness
function Hote({ c }: { c: number }) {
  const horloge = Reanimated.useSharedValue(c);
  const s = spriteDe("forge", "solid");
  if (!s) throw new Error("forge solid has no sprite");
  return (
    <HorlogeContext.Provider value={horloge}>
      <Feux code="forge" stade="solid" s={s} corps={pose("forge", s)} biome="defaut" />
    </HorlogeContext.Provider>
  );
}

describe("Feux", () => {
  test("the forge's flame stands on its hearth, converted as its sprite is", async () => {
    await render(<Hote c={2 * CYCLE_MS} />);
    const s = spriteDe("forge", "solid");
    const foyer = accrochesDe("forge", "solid")?.foyer;
    if (!s || !foyer) throw new Error("no sprite or hearth");
    const corps = pose("forge", s);
    const g = geometrieFlamme(foyer, corps.w / s.size[0]);
    const st = getAnimatedStyle(screen.getByTestId("iso-flamme-forge") as never);
    expect(st.left).toBeCloseTo(corps.x + g.left, 6);
    expect(st.top).toBeCloseTo(corps.y + g.top, 6);
    // lit and still at rest
    expect(st.opacity).toBeCloseTo(1, 6);
    expect(st.transform?.[0]?.scaleY).toBeCloseTo(1, 6);
    expect(screen.getAllByTestId("iso-fumee-forge")).toHaveLength(2);
  });

  test("mid-wave the flame moves by opacity and transform only, and the smoke climbs", async () => {
    await render(<Hote c={CYCLE_MS / 40} />);
    const place = new Set([
      "position",
      "top",
      "left",
      "right",
      "bottom",
      "width",
      "height",
      "transformOrigin",
    ]);
    const flamme = getAnimatedStyle(screen.getByTestId("iso-flamme-forge") as never);
    expect(
      Object.keys(flamme)
        .filter((k) => !place.has(k))
        .sort(),
    ).toEqual(["opacity", "transform"]);
    expect(Number(flamme.transform?.[0]?.scaleY)).not.toBeCloseTo(1, 3);
    const [a] = screen.getAllByTestId("iso-fumee-forge");
    const fumee = getAnimatedStyle(a as never);
    expect(
      Object.keys(fumee)
        .filter((k) => !place.has(k))
        .sort(),
    ).toEqual(["opacity", "transform"]);
  });

  test("each plume starts at the chimney of its own stage, whatever the stage", async () => {
    const vus: string[] = [];
    for (const code of buildingCodes) {
      for (const stade of ["rough", "solid", "grand"] as const) {
        const a = accrochesDe(code, stade);
        const s = spriteDe(code, stade);
        if (!a?.cheminee || !s) continue;
        const corps = pose(code, s);
        const k = corps.w / s.size[0];
        await render(<Feux code={code} stade={stade} s={s} corps={corps} biome="defaut" />);
        for (const v of screen.getAllByTestId(`iso-fumee-${code}`)) {
          const st = getAnimatedStyle(v as never);
          expect(st.left).toBeCloseTo(corps.x + a.cheminee[0] * k - FUMEE_LARGEUR / 2, 6);
          expect(Number(st.top) + FUMEE_LARGEUR * 0.64).toBeCloseTo(corps.y + a.cheminee[1] * k, 6);
        }
        vus.push(`${code}_${stade}`);
        await screen.unmount();
      }
    }
    expect(vus).toEqual(expect.arrayContaining(["forge_solid", "armory_solid", "farm_grand"]));
  });

  test("a stage without a hearth or a chimney draws nothing", async () => {
    const s = spriteDe("windmill", "solid");
    if (!s) throw new Error("no sprite");
    await render(
      <Feux code="windmill" stade="solid" s={s} corps={pose("windmill", s)} biome="defaut" />,
    );
    expect(screen.queryAllByTestId(/^iso-(flamme|fumee)-/)).toHaveLength(0);
  });
});
