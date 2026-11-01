import "react-native-gesture-handler/jestSetup";
import { render, screen } from "@testing-library/react-native";
import type { ReactElement } from "react";
import { etatCarte, stadeDemo } from "@/components/village/iso/carteDemo";
import { IsoCarte } from "@/components/village/iso/IsoCarteDemo";
import { ECHELLE_DECODE, echelleLisiere } from "@/components/village/iso/lisiere";
import { flaquesDe } from "@/components/village/iso/lueurs";
import {
  estDefaut,
  VARIANTES_DEFAUT,
  VariantesContext,
  variantesDe,
} from "@/components/village/iso/variantes";
import type { BuildingCode } from "@/db/schema";

jest.mock("expo-router", () => ({ useIsFocused: () => true }));
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => false }));

type N = { type: string; props: Record<string, unknown>; children: (N | string)[] | null };
const chemins = (n: N | string | null): string[] =>
  n === null || typeof n === "string"
    ? []
    : [
        ...(n.type === "RNSVGPath" && typeof n.props.d === "string" ? [n.props.d] : []),
        ...(n.children ?? []).flatMap(chemins),
      ];
const stade = (code: BuildingCode) => stadeDemo(code, 12);

describe("the perf A/B switches (dev route only)", () => {
  test("absent or unreadable, they keep what ships", () => {
    expect(variantesDe({})).toEqual(VARIANTES_DEFAUT);
    expect(variantesDe({ ech: "abc" }).echelleDecode).toBe(ECHELLE_DECODE);
    expect(variantesDe({ ech: "7" }).echelleDecode).toBe(ECHELLE_DECODE);
    expect(estDefaut(variantesDe({}))).toBe(true);
  });

  test("the query turns each one off or sets it", () => {
    expect(variantesDe({ ech: "0.5", flaques: "0", bornes: "0" })).toEqual({
      echelleDecode: 0.5,
      flaques: false,
      bornes: false,
    });
  });

  test("the decode scale reaches the trees and never the rocks", () => {
    expect(echelleLisiere("decor/arbre_a", 0.5)).toBe(0.5);
    expect(echelleLisiere("decor/rochers_a", 0.5)).toBe(1);
    expect(echelleLisiere("decor/arbre_a")).toBe(ECHELLE_DECODE);
  });

  const monte = async (ui: ReactElement) => {
    await render(ui);
    const json = screen.toJSON() as N | N[] | null;
    return (Array.isArray(json) ? json : [json]).flatMap(chemins);
  };

  test("flaques off: no pool at night", async () => {
    const { visible, montres } = etatCarte(12, false);
    const carte = <IsoCarte visible={visible} montres={montres} stade={stade} lumiere="nuit" />;
    await render(carte);
    expect(screen.getAllByTestId("iso-flaque-nuit").length).toBeGreaterThan(0);
    await screen.unmount();
    await render(
      <VariantesContext.Provider value={{ ...VARIANTES_DEFAUT, flaques: false }}>
        {carte}
      </VariantesContext.Provider>,
    );
    expect(screen.queryAllByTestId("iso-flaque-nuit")).toHaveLength(0);
  });

  test("bornes off: the streets of a young island lose their end stones", async () => {
    const { visible, montres } = etatCarte(2, false);
    const carte = (
      <IsoCarte visible={visible} montres={montres} stade={(c) => stadeDemo(c, 2)} lumiere="nuit" />
    );
    const avec = (await monte(carte)).join("").length;
    await screen.unmount();
    const sans = (
      await monte(
        <VariantesContext.Provider value={{ ...VARIANTES_DEFAUT, bornes: false }}>
          {carte}
        </VariantesContext.Provider>,
      )
    ).join("").length;
    expect(sans).toBeLessThan(avec);
  });
});

describe("the light pools", () => {
  test("the same array while the buildings and their stages are the same (no tile re-render for nothing)", () => {
    const montres: BuildingCode[] = ["campfire", "forge"];
    expect(flaquesDe(montres, (c) => stadeDemo(c, 12))).toBe(
      flaquesDe([...montres], (c) => stadeDemo(c, 12)),
    );
    expect(flaquesDe(montres, (c) => stadeDemo(c, 12))).not.toBe(
      flaquesDe(["campfire"], (c) => stadeDemo(c, 12)),
    );
  });
});
