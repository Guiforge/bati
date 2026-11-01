import "react-native-gesture-handler/jestSetup";
import { render, screen } from "@testing-library/react-native";
import {
  etatCarte,
  LANTERNES,
  stadeDemo,
  VERRES_LANTERNE,
} from "@/components/village/iso/carteDemo";
import { IsoCarte } from "@/components/village/iso/IsoCarteDemo";
import type { buildingCodes } from "@/db/schema";

jest.mock("expo-router", () => ({ useIsFocused: () => true }));
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => false }));

// T39: the lantern's glass is warm in the painted night sprite; by day a dark pane covers it.

type P = readonly [number, number];
const polygone = (points: string): P[] =>
  points.split(" ").map((p) => p.split(",").map(Number) as unknown as P);

function dedans([x, y]: P, poly: readonly P[]): boolean {
  let signe = 0;
  for (const [i, a] of poly.entries()) {
    const b = poly[(i + 1) % poly.length] ?? a;
    const c = (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]);
    if (c !== 0) {
      if (signe !== 0 && Math.sign(c) !== signe) return false;
      signe = Math.sign(c);
    }
  }
  return true;
}

// The convex hulls of the amber pixels of assets/images/village/iso/pieces/decor_lanterne.webp
// (r > 190, g > 130, b < 150, r - b > 70: 6128 pixels), measured with PIL; every pixel lies inside.
const HULLS: readonly P[][] = [
  [
    [271, 229],
    [272, 229],
    [281, 233],
    [307, 246],
    [310, 249],
    [311, 343],
    [311, 346],
    [310, 347],
    [309, 347],
    [296, 341],
    [274, 330],
    [272, 328],
    [271, 295],
  ],
  [
    [325, 248],
    [326, 247],
    [360, 230],
    [363, 229],
    [364, 229],
    [364, 327],
    [363, 328],
    [358, 331],
    [338, 341],
    [327, 346],
    [325, 346],
  ],
];

test("every amber pixel of the lantern's glass is inside its day cover", () => {
  const couvert = VERRES_LANTERNE.map(polygone);
  for (const hull of HULLS)
    for (const p of hull) expect([p, couvert.some((c) => dedans(p, c))]).toEqual([p, true]);
});

describe("the day cover", () => {
  const monte = async (ambiance: "jour" | "nuit") => {
    const { visible, montres } = etatCarte(1, false);
    const stade = (code: (typeof buildingCodes)[number]) => stadeDemo(code, 1);
    await render(
      <IsoCarte visible={visible} montres={montres} stade={stade} ambiance={ambiance} />,
    );
  };
  const id = `iso-lanterne-jour-${LANTERNES[0]?.case.join("-")}`;

  test("mounted by day", async () => {
    await monte("jour");
    expect(screen.queryByTestId(id)).not.toBeNull();
  });

  // dev-iso by day: the sprites stay the night's (ambiance), the light is the day's (lumiere), like the windows.
  test("mounted when only the light is the day's", async () => {
    const { visible, montres } = etatCarte(1, false);
    const stade = (code: (typeof buildingCodes)[number]) => stadeDemo(code, 1);
    await render(
      <IsoCarte visible={visible} montres={montres} stade={stade} ambiance="nuit" lumiere="jour" />,
    );
    expect(screen.queryByTestId(id)).not.toBeNull();
  });

  test("absent at night, where the painted glass is the light", async () => {
    await monte("nuit");
    expect(screen.queryByTestId(id)).toBeNull();
  });
});
