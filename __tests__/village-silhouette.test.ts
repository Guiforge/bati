import { stadeSuivant } from "../components/village/stadeSuivant";

// The silhouette shows the painted stage after the one the rank draws, and nothing otherwise.
describe("stadeSuivant", () => {
  const tous = { rough: 1, solid: 1, grand: 1, legendary: 1, mythic: 1 };

  test("is the next painted stage of the rank", () => {
    expect(stadeSuivant("archery_range", 1, 0, tous)).toBe("solid");
    expect(stadeSuivant("archery_range", 3, 0, tous)).toBe("grand");
  });

  test("skips a stage that is not painted", () => {
    expect(stadeSuivant("archery_range", 1, 0, { rough: 1, grand: 1 })).toBe("grand");
  });

  test("is null at the last painted stage, unbuilt, or with nothing painted", () => {
    expect(stadeSuivant("archery_range", 10, 0, { rough: 1, solid: 1, grand: 1 })).toBeNull();
    expect(stadeSuivant("archery_range", 5, 0, { rough: 1, solid: 1, grand: 1 })).toBeNull();
    expect(stadeSuivant("archery_range", 0, 0, tous)).toBeNull();
    expect(stadeSuivant("archery_range", 4, 0, undefined)).toBeNull();
  });
});
