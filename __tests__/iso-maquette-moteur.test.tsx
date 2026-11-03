// Maquette (the map's one building) with and without the buildings engine: with no engine data the
// tree is the one of today, with it there is one sprite, on the real canvas, and the engine's
// pieces stand around it. The flag is turned on for this file only; it is off in every shipped build.
import "react-native-gesture-handler/jestSetup";
import { configure, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { pose, spriteDe } from "@/components/village/iso/carteDemo";
import { type EtatBld, EtatBldContext } from "@/components/village/iso/etatBld";
import { Maquette } from "@/components/village/iso/IsoCarteDemo";
import { batimentEssai } from "@/constants/buildings/essai";

jest.mock("@/constants/isoPoc", () => ({
  ...jest.requireActual("@/constants/isoPoc"),
  BATIMENT_MOTEUR: true,
}));
jest.mock("react-native-worklets", () => ({
  ...jest.requireActual("react-native-worklets"),
  getUIRuntimeHolder: () => ({}),
}));
jest.mock("expo-router", () => ({ useIsFocused: () => true }));
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => false }));

configure({ defaultIncludeHiddenElements: true });

const etat: EtatBld = {
  code: "windmill",
  rang: 10,
  avant: 9,
  delai: 1.5,
  palier: 12,
  semaine: false,
};
const maquette = (
  <Maquette code="windmill" stade="grand" masque={false} ambiance="nuit" biome="defaut" />
);
const ids = () => screen.queryAllByTestId(/./).map((n) => n.props.testID as string);

describe("Maquette with the engine flag on", () => {
  it("a building with no engine data is the tree it always was, with or without a capture state", async () => {
    await render(maquette);
    const seul = JSON.stringify(screen.toJSON());
    await screen.unmount();
    await render(<EtatBldContext.Provider value={etat}>{maquette}</EtatBldContext.Provider>);
    expect(JSON.stringify(screen.toJSON())).toBe(seul);
    expect(ids()).not.toContain("batiment-corps");
    await screen.unmount();
    // Another building's capture state changes nothing either.
    await render(
      <EtatBldContext.Provider value={{ ...etat, code: "forge", donnees: batimentEssai }}>
        {maquette}
      </EtatBldContext.Provider>,
    );
    expect(JSON.stringify(screen.toJSON())).toBe(seul);
  });

  it("with data there is one sprite, on the real canvas, and the engine's pieces around it", async () => {
    await render(
      <EtatBldContext.Provider value={{ ...etat, donnees: batimentEssai }}>
        {maquette}
      </EtatBldContext.Provider>,
    );
    expect(ids().filter((i) => i.startsWith("iso-maquette-windmill"))).toEqual([
      "iso-maquette-windmill",
    ]);
    expect(ids()).toContain("batiment-corps");
    const s = spriteDe("windmill", "grand", "nuit");
    expect(s?.size).toEqual([896, 1344]);
    if (!s) return;
    const corps = pose("windmill", s);
    const image = StyleSheet.flatten(screen.getByTestId("iso-maquette-windmill").props.style);
    expect(image.left).toBeCloseTo(corps.x, 5);
    expect(image.width).toBeCloseTo(112, 5);
    // The tower's axis, 56 dp from the canvas' left, is where the crystal light stands.
    const cristal = StyleSheet.flatten(screen.getByTestId("batiment-lueur-crystal").props.style);
    expect(cristal.left + cristal.width / 2).toBeCloseTo(corps.x + 56, 5);
    expect(
      StyleSheet.flatten(screen.getByTestId("batiment-addon-2").props.style).width,
    ).toBeGreaterThanOrEqual(10);
    // The engine draws the clan mark: the pride banner is left out.
    expect(ids().some((i) => i.startsWith("iso-fierte"))).toBe(false);
  });
});
