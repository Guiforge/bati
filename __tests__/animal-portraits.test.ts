import fs from "node:fs";
import path from "node:path";
import { ANIMAL_PORTRAITS } from "../constants/animalPortraits";
import { DELIVERED_COATS } from "../db/crestCoat";

const DIR = path.resolve(__dirname, "..", "assets", "images", "animals");
const files = fs
  .readdirSync(DIR)
  .filter((f) => f.endsWith(".webp"))
  .map((f) => f.replace(/\.webp$/, ""));

describe("the portrait table", () => {
  test("every row has its file", () => {
    for (const slug of Object.keys(ANIMAL_PORTRAITS)) expect(files).toContain(slug);
  });

  test("every file has its row, so the table cannot drift from the folder", () => {
    for (const slug of files) expect(Object.keys(ANIMAL_PORTRAITS)).toContain(slug);
  });

  test("the coats that ship are the table's rare and winter rows, and nothing else", () => {
    expect([...DELIVERED_COATS].sort()).toEqual(
      Object.keys(ANIMAL_PORTRAITS)
        .filter((s) => /-(rare|winter)$/.test(s))
        .sort(),
    );
  });
});
