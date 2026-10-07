/**
 * `src/gps/mapThumb.ts`: the still maps under the journal's run lines. What is held here is what
 * costs the hero something when it breaks: a tile fetch for a row no longer on screen, a picture
 * from an old style kept on disk forever, disk reads during a scroll.
 *
 * The fake filesystem and snapshotter live inside their factories (babel hoists `jest.mock` above
 * every declaration) and are reached back through the mocked modules.
 */
jest.mock("expo-file-system", () => {
  const disk = new Set<string>();
  const calls = { list: 0 };
  class File {
    uri: string;
    constructor(dirOrUri: { uri: string } | string, name?: string) {
      this.uri = typeof dirOrUri === "string" ? dirOrUri : `${dirOrUri.uri}/${name}`;
    }
    get name() {
      return this.uri.split("/").pop() ?? "";
    }
    get exists() {
      return disk.has(this.uri);
    }
    delete() {
      disk.delete(this.uri);
    }
    // biome-ignore lint/suspicious/useAwait: mirrors the real Promise-returning signature
    async move(to: File) {
      disk.delete(this.uri);
      disk.add(to.uri);
    }
  }
  class Directory {
    uri: string;
    constructor(base: string, name: string) {
      this.uri = `${base}/${name}`;
    }
    get exists() {
      return true;
    }
    create() {}
    list() {
      calls.list += 1;
      return [...disk].filter((u) => u.startsWith(`${this.uri}/`)).map((u) => new File(u));
    }
  }
  return { File, Directory, Paths: { cache: "file:///cache" }, __disk: disk, __calls: calls };
});

jest.mock("@maplibre/maplibre-react-native", () => {
  const made: string[] = [];
  return {
    __made: made,
    StaticMapImageManager: {
      createImage: jest.fn(() => {
        const uri = `file:///cache/snap-${made.length}.png`;
        made.push(uri);
        const fs = require("expo-file-system") as { __disk: Set<string> };
        fs.__disk.add(uri);
        return Promise.resolve(uri);
      }),
    },
  };
});
jest.mock("@/modules/bati-location", () => ({ isNetworkBlocked: () => false }));
jest.mock("@/stores/settings", () => ({
  useSettingsStore: { getState: () => ({ mapTilesEnabled: true }) },
}));
jest.mock("@/constants/mapStyle", () => ({ mapStyle: {} }));

import * as FileSystem from "expo-file-system";
import type { LngLat } from "@/src/gps/trace";

const fs = FileSystem as unknown as { __disk: Set<string>; __calls: { list: number } };
const snapshotter = () =>
  (
    require("@maplibre/maplibre-react-native") as {
      StaticMapImageManager: { createImage: jest.Mock };
    }
  ).StaticMapImageManager.createImage;

const run: LngLat[] = [
  [2.35, 48.85],
  [2.36, 48.86],
];

/** A fresh copy of the module: its cache folder is read once per process, which is the point. */
function load() {
  let mod!: typeof import("@/src/gps/mapThumb");
  jest.isolateModules(() => {
    mod = require("@/src/gps/mapThumb");
  });
  return mod;
}

beforeEach(() => {
  fs.__disk.clear();
  fs.__calls.list = 0;
  snapshotter().mockClear();
});

test("draws a run's ground once, and serves it from the cache after", async () => {
  const map = load();
  const uri = await map.mapThumbFor("run-1", [run], 64);

  expect(uri).toMatch(/run-1-64-v\d+\.png$/);
  expect(map.cachedMapThumb("run-1", 64)).toBe(uri);
  expect(await map.mapThumbFor("run-1", [run], 64)).toBe(uri);
  expect(snapshotter()).toHaveBeenCalledTimes(1);
});

test("a row that scrolled away before its turn fetches nothing", async () => {
  const map = load();
  const first = map.mapThumbFor("run-1", [run], 64);
  const gone = map.mapThumbFor("run-2", [run], 64);
  map.releaseMapThumb("run-2", 64);

  await first;
  expect(await gone).toBeNull();
  expect(snapshotter()).toHaveBeenCalledTimes(1);
  expect(map.cachedMapThumb("run-2", 64)).toBeNull();
});

test("pictures of an older style are deleted, and the folder is read once", () => {
  fs.__disk.add("file:///cache/map-thumbs/run-1-64-v1.png");
  const map = load();

  for (let i = 0; i < 20; i++) map.cachedMapThumb("run-1", 64);

  expect(fs.__disk.has("file:///cache/map-thumbs/run-1-64-v1.png")).toBe(false);
  expect(fs.__calls.list).toBe(1);
});

// A snapshot whose tiles never come is a weak signal, not a fault: the row logs it as an event,
// and tells it apart from a real failure by this class alone.
test("a snapshot that never finishes rejects as a timeout, not a generic error", async () => {
  jest.useFakeTimers();
  try {
    snapshotter().mockImplementationOnce(() => new Promise(() => {}));
    const map = load();
    const job = map.mapThumbFor("run-1", [run], 64);
    const settled = expect(job).rejects.toBeInstanceOf(map.MapSnapshotTimeout);
    await jest.advanceTimersByTimeAsync(20_000);
    await settled;
    expect(map.cachedMapThumb("run-1", 64)).toBeNull();
  } finally {
    jest.useRealTimers();
  }
});
