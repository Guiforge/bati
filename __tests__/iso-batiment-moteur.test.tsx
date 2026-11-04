// The buildings engine on its test building (constants/buildings/essai.ts, the windmill's stages,
// no new art): add-ons, site teasers, the gag slot, lights, the night sprite, the clan mark, the
// keeper. Plus the proof that with the flags off nothing moves.
import "react-native-gesture-handler/jestSetup";
import { configure, render, screen } from "@testing-library/react-native";
import { Text, View } from "react-native";
import { BatimentMoteur } from "@/components/village/iso/BatimentMoteur";
import { BATIMENT_MOTEUR, etatBatiment, type Marque } from "@/components/village/iso/batiment";
import { claimableParRang, enAttente, MONTEE_PAR_RANG } from "@/components/village/iso/montee";
import { gagBeatAt, gagIsOneAtATime } from "@/constants/buildingData";
import { buildingStage } from "@/constants/buildingLevels";
import { BUILDING_STAGES_RULE, buildingStageFor } from "@/constants/buildingStages";
import { batimentEssai as data } from "@/constants/buildings/essai";
import { claimable } from "@/db/village";

jest.mock("react-native-worklets", () => ({
  ...jest.requireActual("react-native-worklets"),
  getUIRuntimeHolder: () => ({}),
}));
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));

let mockReduit = false;
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => mockReduit }));

configure({ defaultIncludeHiddenElements: true });

// The real canvas of the windmill, 896 x 1344 px, at 1/8 dp a px.
const BOITE = { x: 0, y: 0, w: 112, h: 168 };
const RANGS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const rule = "B" as const;
const etat = (r: number, nuit = false) => etatBatiment(data, r, { nuit, rule });
const ordreMarque: (Marque | null)[] = [
  null,
  "fanion",
  "banniere",
  "blasonSculpte",
  "blasonLumineux",
];

describe("the flags are off by default", () => {
  it("engine, rank-pending and stage rule all keep today's behaviour", () => {
    expect(BATIMENT_MOTEUR).toBe(false);
    expect(MONTEE_PAR_RANG).toBe(false);
    expect(BUILDING_STAGES_RULE).toBe("old");
    for (let r = 0; r <= 10; r++) {
      expect(buildingStageFor("windmill", r)).toBe(buildingStage(r));
    }
  });

  it("with the engine off, the building renders exactly as without the engine", async () => {
    const corps = (
      <View testID="sprite">
        <Text>windmill</Text>
      </View>
    );
    await render(corps);
    const nu = JSON.stringify(screen.toJSON());
    await screen.unmount();
    await render(
      <BatimentMoteur
        data={data}
        rank={10}
        nuit
        corps={BOITE}
        taille={[896, 1344]}
        ancre={[448, 1300]}
        sprite={() => corps}
      />,
    );
    expect(JSON.stringify(screen.toJSON())).toBe(nu);
  });

  it("the pending list is today's list while the flag is off, rank or not", () => {
    // Rank 4 -> 5 crosses a stage, rank 3 -> 4 does not.
    const b = [
      { code: "windmill", level: 4 },
      { code: "forge", level: 6 },
    ] as const;
    const claimed = { windmill: 3, forge: 5 } as const;
    expect(enAttente(b, claimed)).toEqual(claimable(b, claimed));
    expect(enAttente(b, claimed)).toEqual([]);
    expect(enAttente(b, claimed, true)).toEqual(["windmill", "forge"]);
    expect(claimableParRang(b, claimed)).toEqual(["windmill", "forge"]);
  });
});

describe("what the building wears, rank by rank", () => {
  it("add-ons only add up: nothing disappears", () => {
    for (const r of RANGS.slice(1)) {
      const avant = etat(r - 1).addOns;
      const apres = etat(r).addOns;
      expect(apres.length).toBeGreaterThanOrEqual(avant.length);
      for (const a of avant) expect(apres).toContain(a);
    }
    expect(etat(10).addOns).toHaveLength(data.addOns.length);
  });

  it("lights, the keeper and the clan mark never go away, and the mark only grows", () => {
    let forme = 0;
    for (const r of RANGS) {
      const e = etat(r, true);
      const avant = etat(Math.max(1, r - 1), true);
      expect(e.lights).toEqual(expect.arrayContaining([...avant.lights]));
      expect(e.gardien).not.toBeNull();
      const i = ordreMarque.indexOf(e.marque);
      expect(i).toBeGreaterThanOrEqual(forme);
      forme = i;
      expect(e.marqueAt).toEqual(e.marque ? data.clanMark : null);
    }
    expect(etat(2).marque).toBeNull();
    expect(etat(3).marque).toBe("fanion");
    expect(etat(5).marque).toBe("banniere");
    expect(etat(7).marque).toBe("blasonSculpte");
    expect(etat(10).marque).toBe("blasonLumineux");
  });

  it("the stage never drops below today's mapping", () => {
    const ordre = ["rough", "solid", "grand", "legendary", "mythic"];
    for (const r of RANGS) {
      expect(ordre.indexOf(etat(r).stage)).toBeGreaterThanOrEqual(
        ordre.indexOf(buildingStageFor("windmill", r, 0, "old")),
      );
    }
  });

  it("a site teaser stands on the in-between ranks and leaves when the next stage paints it", () => {
    for (const r of [2, 4, 6, 8, 9]) expect(etat(r).teaser).not.toBeNull();
    for (const r of [1, 3, 5, 7, 10]) expect(etat(r).teaser).toBeNull();
    // A teaser ends on a rank that opens a stage, or hands over to the bigger one of rank 9.
    const fins = (data.teasers ?? []).map(
      (t) =>
        etat(t.untilRank).stage !== etat(t.fromRank).stage || etat(t.untilRank).teaser !== null,
    );
    expect(fins).toEqual(fins.map(() => true));
  });

  it("the gag slot holds one beat, and each beat replaces the previous one", () => {
    expect(gagIsOneAtATime(data)).toBe(true);
    for (const r of RANGS) expect(etat(r).gag).toEqual(gagBeatAt(data, r));
    expect(etat(3).gag?.beat).toBe(etat(2).gag?.beat);
    expect(etat(4).gag?.beat).not.toBe(etat(2).gag?.beat);
    expect(etat(10).gag?.beat).toBe(data.gag.beats.at(-1)?.beat);
  });

  it("lights and the night sprite exist at night only", () => {
    expect(etat(10, false).lights).toEqual([]);
    expect(etat(10, false).nightSprite).toBeNull();
    expect(etat(10, true).lights).toHaveLength(3);
    expect(etat(10, true).nightSprite).not.toBeNull();
    expect(etat(6, true).nightSprite).toBeNull();
  });
});

// What the engine draws at a rank, mounted: the layers stand, flat, and none can be tapped. The
// growth moment is not here (it plays on the map's real path, IsoCroissance).
describe("the layers, mounted", () => {
  beforeEach(() => {
    mockReduit = false;
  });
  const ids = () => screen.queryAllByTestId(/^batiment-/).map((n) => n.props.testID as string);
  const monte = (rank: number, nuit = false) =>
    render(
      <BatimentMoteur
        actif
        data={data}
        rank={rank}
        nuit={nuit}
        rule={rule}
        corps={BOITE}
        taille={[896, 1344]}
        ancre={[448, 1300]}
        sprite={() => <View testID="sprite" />}
        couches={() => <View testID="couches" />}
        reclame={<View testID="reclame" />}
      />,
    );

  it("a rank draws its add-ons, its mark and the sprite, with nothing of a show", async () => {
    await monte(5);
    expect(screen.getByTestId("sprite")).toBeTruthy();
    expect(ids()).toContain("batiment-marque-banniere");
    expect(ids()).toContain("batiment-addon-4");
    expect(ids()).not.toContain("batiment-echafaudage");
    expect(ids()).not.toContain("batiment-poussiere");
  });

  it("by night the lights are there, and none of the layers can be tapped", async () => {
    await monte(4, true);
    expect(ids()).toContain("batiment-lueur-fire");
    for (const n of screen.queryAllByTestId(/^batiment-/)) {
      if (n.props.testID === "batiment-corps") continue;
      expect(n.props.pointerEvents).toBe("none");
      expect(n.props.onPress).toBeUndefined();
    }
  });
});
