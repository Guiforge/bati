import { ambianceForcee, choisirLumiere, estJour } from "@/components/village/iso/lumiere";

describe("iso lumiere (T15)", () => {
  // JOUR_SEUL is `DISTRIBUTION === "play"` (src/distribution.ts); the choice takes it as a flag.
  it("free Play: fixed day, at any hour", () => {
    for (const heure of [0, 3, 12, 22]) {
      expect(choisirLumiere({ jourSeul: true, plus: false, heure })).toBe("jour");
    }
  });
  it("F-Droid and GitHub: day and night by the hour", () => {
    expect(choisirLumiere({ jourSeul: false, plus: false, heure: 12 })).toBe("jour");
    expect(choisirLumiere({ jourSeul: false, plus: false, heure: 23 })).toBe("nuit");
    expect(choisirLumiere({ jourSeul: false, plus: false, heure: 6 })).toBe("nuit");
  });
  it("Bati+ on Play gets the cycle", () => {
    expect(choisirLumiere({ jourSeul: true, plus: true, heure: 23 })).toBe("nuit");
  });
  it("the override wins; a bad value is no override", () => {
    expect(choisirLumiere({ jourSeul: true, plus: false, heure: 12, force: "nuit" })).toBe("nuit");
    expect(ambianceForcee("jour")).toBe("jour");
    expect(ambianceForcee("soir")).toBeUndefined();
  });
  it("the day runs 7:00 to 19:59", () => {
    expect(estJour(7)).toBe(true);
    expect(estJour(20)).toBe(false);
  });
});

describe("JOUR_SEUL on the real src/distribution.ts", () => {
  afterEach(() => {
    delete process.env.EXPO_PUBLIC_DISTRIBUTION;
  });

  test.each([
    ["play", true],
    ["fdroid", false],
    ["github", false],
  ])("%s -> %s", (distribution, attendu) => {
    process.env.EXPO_PUBLIC_DISTRIBUTION = distribution;
    let jourSeul: boolean | undefined;
    jest.isolateModules(() => {
      jourSeul = require("@/src/distribution").JOUR_SEUL;
    });
    expect(jourSeul).toBe(attendu);
  });
});
