import { readFileSync } from "node:fs";
import { fireEvent, render, screen } from "@testing-library/react-native";
import type { CrestShape } from "@/components/village/Crest";
import { COTE } from "@/components/village/iso/carteDemo";
import { Statue } from "@/components/village/iso/Statue";
import {
  blasonFactice,
  boiteStatue,
  DP_PAR_PX,
  ECHELLES,
  etatStatue,
  IMAGE_PX,
  MATIERES,
  NOM_STATUE,
  PIED_PX,
  piedStatue,
  STADES,
  statueAuPoint,
} from "@/components/village/iso/statue";
import { ANIMALS } from "@/db/crestRules";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string, o?: object) => `${k}${o ? JSON.stringify(o) : ""}` }),
}));

const crest: CrestShape & { stage: "legendary" } = {
  animal: "boar",
  manual: false,
  quarters: null,
  longestFlame: 0,
  rings: 0,
  second: null,
  stage: "legendary",
};
const tout = Array.from({ length: 20 }, () => Array.from({ length: 20 }, () => true));

describe("statue", () => {
  test("the six sidecars hold the cropped size", () => {
    for (const nom of Object.values(NOM_STATUE)) {
      const j = JSON.parse(
        readFileSync(`assets/images/village/iso/pieces/statue_${nom}.json`, "utf8"),
      );
      expect(j.size).toEqual([IMAGE_PX.w, IMAGE_PX.h]);
    }
    expect(Object.keys(NOM_STATUE).sort()).toEqual([...ANIMALS].sort());
  });

  test("each webp is the size its sidecar says, and the mask derives from it", () => {
    for (const nom of Object.values(NOM_STATUE)) {
      const base = `assets/images/village/iso/pieces/statue_${nom}`;
      const j = JSON.parse(readFileSync(`${base}.json`, "utf8"));
      const b = readFileSync(`${base}.webp`);
      let taille: [number, number];
      const type = b.toString("ascii", 12, 16);
      if (type === "VP8X") taille = [b.readUIntLE(24, 3) + 1, b.readUIntLE(27, 3) + 1];
      else if (type === "VP8L") {
        const v = b.readUInt32LE(21);
        taille = [(v & 0x3fff) + 1, ((v >> 14) & 0x3fff) + 1];
      } else taille = [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
      expect(taille).toEqual(j.size);
      const { step, w, h, rows } = j.mask;
      expect([step, w, h]).toEqual([8, Math.ceil(j.size[0] / 8), Math.ceil(j.size[1] / 8)]);
      expect(rows).toHaveLength(h);
      expect(rows.every((r: string) => r.length === w && /^[01]+$/.test(r))).toBe(true);
      expect(rows.join("")).toContain("1");
    }
  });

  test("four growing scales; gold only at the legendary stage; stone is the bare painting", () => {
    const h = STADES.map((s) => ECHELLES[s]);
    expect(h).toEqual([...h].sort((a, b) => a - b));
    expect(new Set(h).size).toBe(4);
    expect(STADES.filter((s) => MATIERES[s].teinte !== null && MATIERES[s].dessin < 1)).toEqual([
      "young",
      "venerable",
      "legendary",
    ]);
    expect(MATIERES.adult.teinte).toBeNull();
  });

  test("the dev-iso crest: a known animal and stage, young by default, null for an unknown animal", () => {
    expect(blasonFactice("cerf", "legendary")).toMatchObject({
      animal: "stag",
      stage: "legendary",
    });
    expect(blasonFactice("sanglier", undefined)).toMatchObject({ animal: "boar", stage: "young" });
    expect(blasonFactice("cerf", "mythique")?.stage).toBe("young");
    expect(blasonFactice("dragon", "adult")).toBeNull();
    expect(blasonFactice(undefined, "adult")).toBeNull();
  });

  test("the biggest plinth stays inside its cell's width, a margin left to the fire's platform", () => {
    const base = 191 * DP_PAR_PX * ECHELLES.legendary;
    expect(base).toBeLessThan(0.7 * COTE);
    expect(PIED_PX.x).toBe(130);
  });

  test("no crest, an empty plinth; a crest, its animal and stage (boar included)", () => {
    expect(etatStatue(null)).toBeNull();
    expect(etatStatue(crest)).toEqual({ animal: "boar", stade: "legendary" });
  });

  test("the box holds the foot and a point inside hits only when the cell shows", () => {
    const e = etatStatue(crest);
    const b = boiteStatue(piedStatue(), e);
    expect(b.h).toBeCloseTo(IMAGE_PX.h * DP_PAR_PX * ECHELLES.legendary);
    const dedans: [number, number] = [b.x + b.w / 2, b.y + b.h / 2];
    expect(statueAuPoint(dedans, tout, e)).toBe(true);
    expect(statueAuPoint([b.x - 1, b.y], tout, e)).toBe(false);
    expect(statueAuPoint(dedans, [], e)).toBe(false);
  });

  test("the animal's statue takes its material wash, and a touch calls the handler", async () => {
    const onPress = jest.fn();
    const e = etatStatue(crest);
    await render(<Statue boite={boiteStatue(piedStatue(), e)} etat={e} onPress={onPress} />);
    expect(screen.getByTestId("iso-statue-image")).toBeTruthy();
    expect(screen.getByTestId("iso-statue-matiere")).toBeTruthy();
    const el = screen.getByTestId("iso-statue");
    expect(el.props.accessibilityLabel).toContain("village.iso.statue");
    await fireEvent.press(el);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test("the empty plinth draws no animal", async () => {
    await render(
      <Statue boite={boiteStatue(piedStatue(), null)} etat={null} onPress={jest.fn()} />,
    );
    expect(screen.queryByTestId("iso-statue-image")).toBeNull();
    expect(screen.getByTestId("iso-statue").props.accessibilityLabel).toContain(
      "village.iso.statue_nu",
    );
  });
});
