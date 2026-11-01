import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Image } from "expo-image";
import * as SecureStore from "expo-secure-store";

import { viderCacheSiSpritesChanges } from "@/components/village/iso/cacheImages";
import { EMPREINTE_SPRITES } from "@/components/village/iso/empreinteSprites";

const { calculer } = require("../scripts/iso/empreinte-sprites.js");

jest.mock("expo-secure-store", () => {
  const m = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (k: string) => m.get(k) ?? null),
    setItemAsync: jest.fn((k: string, v: string) => {
      m.set(k, v);
      return Promise.resolve();
    }),
  };
});
jest.mock("expo-image", () => ({
  Image: { clearMemoryCache: jest.fn(async () => true), clearDiskCache: jest.fn(async () => true) },
}));

describe("village image cache", () => {
  test("the committed fingerprint matches the images on disk", () => {
    expect(EMPREINTE_SPRITES).toBe(calculer());
  });

  test("two contents give two fingerprints", () => {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), "emp-"));
    fs.writeFileSync(path.join(d, "a.webp"), "un");
    const avant = calculer([d]);
    fs.writeFileSync(path.join(d, "a.webp"), "deux");
    expect(calculer([d])).not.toBe(avant);
  });

  test("a changed fingerprint empties the caches once, an unchanged one leaves them", async () => {
    expect(await viderCacheSiSpritesChanges("v1")).toBe(true);
    expect(await viderCacheSiSpritesChanges("v1")).toBe(false);
    expect(Image.clearDiskCache).toHaveBeenCalledTimes(1);
    expect(await viderCacheSiSpritesChanges("v2")).toBe(true);
    expect(Image.clearDiskCache).toHaveBeenCalledTimes(2);
    expect(await SecureStore.getItemAsync("village.empreinteSprites")).toBe("v2");
  });
});
