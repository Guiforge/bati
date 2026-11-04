// The Contre-jour moment's plan (moment.ts), pure: the film's poses at given times, a skip, reduced motion.
import {
  dureeMoment,
  ECHANGE_MS,
  genreDeCroissance,
  poseMoment,
  RANG_MS,
  STADE_MS,
  tempsMoment,
} from "@/components/village/iso/moment";

describe("a stage change, from the tap", () => {
  test("at 0 the old stage and its scaffold stand still: no light, no ink, no dust", () => {
    const p = poseMoment("stade", 0);
    expect(p).toMatchObject({ lueur: 0, encre: 0, ancien: true, nouveau: 0, poussiere: 0 });
  });

  test("by 100 ms the light is up and the old stage is flat ink", () => {
    const p = poseMoment("stade", 100);
    expect(p.lueur).toBe(1);
    expect(p.encre).toBe(1);
    expect(p.ancien).toBe(true);
  });

  test("the swap at 200 ms: the new silhouette starts at 0.88 and the dust rises", () => {
    expect(poseMoment("stade", ECHANGE_MS - 1).ancien).toBe(true);
    const p = poseMoment("stade", ECHANGE_MS);
    expect(p.ancien).toBe(false);
    expect(p.nouveau).toBeCloseTo(0.88, 5);
    expect(p.poussiere).toBe(1);
  });

  test("the new stage overshoots to 1.06 at 340 ms and is on 1 by 420 ms", () => {
    expect(poseMoment("stade", 340).nouveau).toBeCloseTo(1.06, 5);
    expect(poseMoment("stade", 420).nouveau).toBeCloseTo(1, 5);
  });

  test("the lights come on at 450 to 530 ms, in the still-black mass", () => {
    expect(poseMoment("stade", 449).lumieres).toBe(0);
    expect(poseMoment("stade", 450).encre).toBe(1);
    expect(poseMoment("stade", 530).lumieres).toBe(1);
  });

  test("the colour returns and the light falls from 500 to 760 ms; the dust clears by 1000", () => {
    expect(poseMoment("stade", 630).encre).toBeGreaterThan(0);
    expect(poseMoment("stade", 630).encre).toBeLessThan(1);
    expect(poseMoment("stade", 760).lueur).toBe(0);
    expect(poseMoment("stade", 760).encre).toBe(0);
    expect(poseMoment("stade", 900).poussiere).toBeGreaterThan(0);
    expect(poseMoment("stade", 999).poussiere).toBeLessThan(0.01);
  });
});

describe("a rank inside a stage", () => {
  test("the piece is absent, then pops 0 to 1.10 to 1 in ink, its colour back by 450 ms", () => {
    expect(poseMoment("rang", 50).nouveau).toBe(0);
    expect(poseMoment("rang", 200).nouveau).toBeCloseTo(1.1, 5);
    expect(poseMoment("rang", 300).nouveau).toBeCloseTo(1, 5);
    expect(poseMoment("rang", 250).encre).toBe(1);
    expect(poseMoment("rang", 450).encre).toBe(0);
  });

  test("a small light behind it, then nothing; no dust and no old stage", () => {
    expect(poseMoment("rang", 100).lueur).toBe(1);
    expect(poseMoment("rang", 450).lueur).toBe(0);
    for (const t of [0, 150, 300, 449]) {
      expect(poseMoment("rang", t).poussiere).toBe(0);
      expect(poseMoment("rang", t).ancien).toBe(false);
    }
  });
});

describe("the end, a skip and reduced motion", () => {
  test("a skip is the clock on the end: the final state, whatever came before", () => {
    for (const genre of ["stade", "rang"] as const) {
      const fin = tempsMoment(genre, { saute: true, reduit: false });
      expect(fin).toBe(dureeMoment(genre));
      expect(poseMoment(genre, fin)).toMatchObject({
        lueur: 0,
        encre: 0,
        ancien: false,
        nouveau: 1,
        lumieres: 1,
        poussiere: 0,
      });
    }
    expect(STADE_MS).toBe(1000);
    expect(RANG_MS).toBe(450);
  });

  test("reduced motion swaps at once: no light, no ink, no dust, lights on", () => {
    expect(tempsMoment("stade", { saute: false, reduit: true })).toBe(STADE_MS);
    expect(tempsMoment("stade", { saute: false, reduit: false })).toBe(0);
  });

  test("a growth is a stage change for a new building or a new stage, else a rank", () => {
    expect(genreDeCroissance(null, "rough")).toBe("stade");
    expect(genreDeCroissance("rough", "solid")).toBe("stade");
    expect(genreDeCroissance("solid", "solid")).toBe("rang");
  });
});
