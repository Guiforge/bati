import "react-native-gesture-handler/jestSetup";
import { render } from "@testing-library/react-native";
import {
  etatCarte,
  ombreSocleDe,
  ombresDe,
  spriteDe,
  stadeDemo,
} from "@/components/village/iso/carteDemo";
import { IsoCarte } from "@/components/village/iso/IsoCarteDemo";
import { DEJA_PEINTE } from "@/components/village/iso/isoSpec";
import { buildingCodes } from "@/db/schema";

jest.mock("expo-router", () => ({ useIsFocused: () => true }));
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => false }));

// L4-T06: ambiance and biome are props of the map; the defaults are the values drawn so far.

describe("the defaults are the values drawn so far", () => {
  test("sources, shadows and socle shadows: default equals nuit passed explicitly", () => {
    for (const code of buildingCodes)
      for (const stade of ["rough", "solid", "grand"] as const) {
        expect(spriteDe(code, stade)).toBe(spriteDe(code, stade, "nuit"));
        expect(ombresDe(code, stade)).toEqual(ombresDe(code, stade, "nuit"));
      }
  });

  test("the whole tree (sources, fills, clips) is identical by default and passed explicitly", async () => {
    const { visible, montres } = etatCarte(12, true);
    const stade = (code: (typeof buildingCodes)[number]) => stadeDemo(code, 12);
    const a = await render(<IsoCarte visible={visible} montres={montres} stade={stade} />);
    const parDefaut = JSON.stringify(a.toJSON());
    await a.unmount();
    const b = await render(
      <IsoCarte visible={visible} montres={montres} stade={stade} ambiance="nuit" biome="defaut" />,
    );
    expect(JSON.stringify(b.toJSON())).toBe(parDefaut);
    expect(parDefaut).toContain("iso-maquette-forge");
  });
});

describe("one world, painted by day (F2)", () => {
  test("every stage has a day sprite but the ones left in the night, with its night's geometry", () => {
    for (const code of buildingCodes)
      for (const stade of ["rough", "solid", "grand"] as const) {
        const nuit = spriteDe(code, stade, "nuit");
        const jour = spriteDe(code, stade, "jour");
        if (!nuit) continue;
        expect(jour).toBeDefined();
        // The night is graded from the day painting: same canvas, anchor and tap mask.
        const { image: _j, ...geoJour } = jour ?? nuit;
        const { image: _n, ...geoNuit } = nuit;
        expect([code, stade, geoJour]).toEqual([code, stade, geoNuit]);
      }
    expect(spriteDe("forge", "solid", "jour")).not.toBe(spriteDe("forge", "solid", "nuit"));
  });

  test("DEJA_PEINTE is empty (H3-15): the day sprites carry no socle shadow, the app draws it in both lights", () => {
    expect(DEJA_PEINTE.size).toBe(0);
    expect(ombreSocleDe("forge", "solid")).not.toBeNull();
  });
});
