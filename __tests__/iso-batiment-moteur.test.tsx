// The buildings engine on its test building (constants/buildings/essai.ts, the windmill's stages,
// no new art): add-ons, site teasers, the gag slot, lights, the night sprite, the clan mark, the
// keeper, and the two moments. Plus the proof that with the flags off nothing moves.
import "react-native-gesture-handler/jestSetup";
import { act, configure, fireEvent, render, screen } from "@testing-library/react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { BatimentMoteur } from "@/components/village/iso/BatimentMoteur";
import { BATIMENT_MOTEUR, etatBatiment, type Marque } from "@/components/village/iso/batiment";
import { claimableParRang, enAttente, MONTEE_PAR_RANG } from "@/components/village/iso/montee";
import {
  ETAPES,
  echelleCorps,
  genreDe,
  planSpectacle,
  rangsA,
  rebond,
  sautGardien,
} from "@/components/village/iso/spectacleBatiment";
import { useSpectacleBatiment } from "@/components/village/iso/useSpectacleBatiment";
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

describe("the two moments, as plans", () => {
  it("a stage change is the full show, a rank inside a stage the short beat, nothing else rises", () => {
    expect(genreDe("windmill", 2, 3, { rule })).toBe("stade");
    expect(genreDe("windmill", 3, 4, { rule })).toBe("rang");
    expect(genreDe("windmill", 4, 4, { rule })).toBeNull();
    expect(genreDe("windmill", 5, 4, { rule })).toBeNull();
    expect(ETAPES.stade.map(([e]) => e)).toEqual([
      "anticipation",
      "echafaudage",
      "poussiere",
      "revelation",
      "gardien",
      "marque",
    ]);
    expect(ETAPES.rang.map(([e]) => e)).toEqual(["poussiere", "revelation", "gardien"]);
  });

  it("update day: one show straight to the new rank, no rank in between", () => {
    expect(genreDe("windmill", 1, 10, { rule })).toBe("stade");
    const plan = planSpectacle("stade", 1, 10, false);
    for (let t = 0; t <= plan.total; t += 25) {
      const { corps, marque } = rangsA(plan, t);
      expect([1, 10]).toContain(corps);
      expect([1, 10]).toContain(marque);
    }
    expect(rangsA(plan, plan.total)).toEqual({ corps: 10, marque: 10 });
  });

  it("the clan mark takes its next form after the building does", () => {
    const plan = planSpectacle("stade", 2, 3, false);
    const revele = plan.etapes.find((e) => e.etape === "revelation");
    const marque = plan.etapes.find((e) => e.etape === "marque");
    expect(revele && marque).toBeTruthy();
    const t = (revele?.debut ?? 0) + 1;
    expect(rangsA(plan, t)).toEqual({ corps: 3, marque: 2 });
    expect(rangsA(plan, marque?.debut ?? 0).marque).toBe(3);
  });

  it("the body is on screen at every frame, in both moments, night or day", () => {
    for (const genre of ["stade", "rang"] as const) {
      const plan = planSpectacle(genre, 2, 3, false);
      for (let t = 0; t <= plan.total; t += 5) {
        expect(echelleCorps(plan, t)).toBeGreaterThanOrEqual(0.94);
        expect(echelleCorps(plan, t)).toBeLessThanOrEqual(1.1);
      }
      expect(rebond(1)).toBe(1);
      expect(sautGardien(plan, plan.total)).toBe(0);
    }
  });

  it("reduced motion has no steps and lands on the final image", () => {
    const plan = planSpectacle("stade", 2, 3, true);
    expect(plan.etapes).toEqual([]);
    expect(plan.total).toBe(0);
    expect(rangsA(plan, 0)).toEqual({ corps: 3, marque: 3 });
    expect(echelleCorps(plan, 0)).toBe(1);
  });
});

// A parent that does what IsoVillage will: a tap starts the moment, nothing else does.
// biome-ignore lint/style/useComponentExportOnlyModules: a test harness
function Parent({
  nuit = false,
  rank = 3,
  masque = false,
}: {
  nuit?: boolean;
  rank?: number;
  masque?: boolean;
}) {
  const { spectacle, jouer, fini } = useSpectacleBatiment();
  const [rang, setRang] = useState(rank);
  return (
    <View>
      <Pressable
        testID="tap"
        onPress={() => {
          const s = jouer("windmill", rang, rang + 1, { rule });
          if (s) setRang(rang + 1);
        }}
      />
      <BatimentMoteur
        actif
        data={data}
        rank={rang}
        nuit={nuit}
        rule={rule}
        corps={BOITE}
        taille={[896, 1344]}
        ancre={[448, 1300]}
        spectacle={spectacle}
        onFini={fini}
        sprite={(stade, suivant) => (
          <View testID={suivant ? `sprite-${stade}-suivant` : "sprite"} />
        )}
        couches={<View testID="couches" />}
        reclame={<View testID="reclame" />}
        masque={masque}
      />
    </View>
  );
}
const ms = (genre: "stade" | "rang", i: number) => ETAPES[genre][i]?.[1] ?? 0;
const ids = () => screen.queryAllByTestId(/^batiment-/).map((n) => n.props.testID as string);

describe("the layers, mounted", () => {
  beforeEach(() => {
    mockReduit = false;
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("nothing plays without a tap, whatever the rank", async () => {
    await render(<Parent rank={4} />);
    await act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(ids()).not.toContain("batiment-echafaudage");
    expect(ids()).not.toContain("batiment-poussiere");
    expect(screen.getByTestId("sprite")).toBeTruthy();
  });

  it("a tap on a stage change plays the full show, the body stays, then it ends once", async () => {
    await render(<Parent rank={4} />);
    expect(ids()).toContain("batiment-marque-fanion");
    await fireEvent.press(screen.getByTestId("tap"));
    expect(screen.getByTestId("batiment-poussiere")).toBeTruthy();
    // Anticipation, then the scaffold takes the gag slot with the build gag.
    await act(() => {
      jest.advanceTimersByTime(ms("stade", 0) + 10);
    });
    expect(ids()).toContain("batiment-echafaudage");
    expect(ids()).toContain("batiment-gag-chantier");
    expect(
      ids().filter((i) => i.startsWith("batiment-gag-") && i !== "batiment-gag-chantier"),
    ).toEqual([]);
    expect(screen.getByTestId("sprite")).toBeTruthy();
    // The reveal: the new rank's pieces, the old mark until the last step.
    await act(() => {
      jest.advanceTimersByTime(ms("stade", 1) + ms("stade", 2));
    });
    expect(ids()).not.toContain("batiment-echafaudage");
    // Rank 5 opens grand: the rank 4 teaser is gone, painted in, the rank 4 beat still holds the slot.
    expect(ids()).not.toContain("batiment-teaser");
    expect(ids()).toContain("batiment-gag-4");
    expect(ids()).toContain("batiment-marque-fanion");
    await act(() => {
      jest.advanceTimersByTime(ms("stade", 3) + ms("stade", 4) + 20);
    });
    expect(ids()).toContain("batiment-marque-banniere");
    await act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(ids()).not.toContain("batiment-poussiere");
    expect(ids()).toContain("batiment-gag-4");
  });

  it("a rank inside a stage plays the short beat: dust, the new piece, no scaffold", async () => {
    await render(<Parent rank={3} />);
    expect(ids()).not.toContain("batiment-addon-4");
    await fireEvent.press(screen.getByTestId("tap"));
    await act(() => {
      jest.advanceTimersByTime(ms("rang", 0) + 10);
    });
    expect(ids()).toContain("batiment-addon-4");
    expect(ids()).not.toContain("batiment-echafaudage");
    await act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(ids()).toContain("batiment-addon-4");
  });

  it("the show reads the same by night, with its lights, and none of the layers can be tapped", async () => {
    await render(<Parent rank={4} nuit />);
    expect(ids()).toContain("batiment-lueur-fire");
    await fireEvent.press(screen.getByTestId("tap"));
    await act(() => {
      jest.advanceTimersByTime(ms("stade", 0) + 10);
    });
    expect(ids()).toContain("batiment-echafaudage");
    expect(ids()).toContain("batiment-lueur-fire");
    for (const n of screen.queryAllByTestId(/^batiment-/)) {
      if (n.props.testID === "batiment-corps") continue;
      expect(n.props.pointerEvents).toBe("none");
      expect(n.props.onPress).toBeUndefined();
      expect(n.props.onClick).toBeUndefined();
    }
  });

  it("a second tap during a moment does nothing", async () => {
    await render(<Parent rank={4} />);
    await fireEvent.press(screen.getByTestId("tap"));
    await fireEvent.press(screen.getByTestId("tap"));
    await act(() => {
      jest.advanceTimersByTime(10_000);
    });
    // Rank 4 -> 5 once: the banner, not a rank 6 piece.
    expect(ids()).toContain("batiment-marque-banniere");
    expect(ids()).not.toContain("batiment-addon-6");
  });

  it("with reduced motion the final image is there at once, the moment stays, lights stand still", async () => {
    mockReduit = true;
    await render(<Parent rank={4} nuit />);
    await fireEvent.press(screen.getByTestId("tap"));
    expect(ids()).toContain("batiment-marque-banniere");
    expect(ids()).toContain("batiment-gardien-reagit");
    expect(ids()).not.toContain("batiment-poussiere");
    expect(ids()).not.toContain("batiment-echafaudage");
    expect(screen.getByTestId("sprite")).toBeTruthy();
    expect(ids()).toContain("batiment-lueur-fire");
  });
});
