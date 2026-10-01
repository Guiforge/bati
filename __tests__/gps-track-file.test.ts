/**
 * `exportTrack` is the one door a finished run leaves the phone by as a GPX: the share screen
 * calls it, and the recap used to format and name its own. What is held here is what that door
 * promises: the file is named after the run, its header carries the reducer's distance for the
 * fixes inside it, and the share sheet gets that same file typed as GPX.
 *
 * The fake filesystem lives inside the factory because babel hoists `jest.mock` above every
 * declaration in the file. The test reads it back through the mocked module.
 */
jest.mock("expo-file-system", () => {
  const disk = new Map<string, string>();
  class Directory {
    uri: string;
    constructor(...parts: (string | Directory)[]) {
      this.uri = parts.map((p) => (typeof p === "string" ? p : p.uri)).join("/");
    }
    get exists() {
      return true;
    }
    create() {}
  }
  class File {
    uri: string;
    constructor(dir: Directory, name: string) {
      this.uri = `${dir.uri}/${name}`;
    }
    get name() {
      return this.uri.split("/").pop() ?? "";
    }
    get exists() {
      return disk.has(this.uri);
    }
    create() {
      disk.set(this.uri, "");
    }
    write(text: string) {
      disk.set(this.uri, text);
    }
  }
  return { File, Directory, Paths: { document: "file:///doc" }, __disk: disk };
});

jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@/src/reportError", () => ({ reportError: jest.fn() }));

import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import type { LocationFix } from "@/modules/bati-location";
import { toGpx } from "@/src/gps/gpx";
import { accept, EMPTY } from "@/src/gps/track";
import { exportTrack } from "@/src/gps/trackFile";

const disk = (FileSystem as unknown as { __disk: Map<string, string> }).__disk;

const T0 = Date.UTC(2026, 8, 20, 7, 0, 0);

/** A straight walk north at 1.4 m/s, one fix a second, clean enough for the reducer to credit. */
function walk(): LocationFix[] {
  return Array.from({ length: 120 }, (_, i) => ({
    t: T0 + i * 1000,
    lat: 48.85 + (i * 1.4) / 111_320,
    lon: 2.35,
    ele: null,
    baro: null,
    acc: 5,
    speed: 1.4,
    distFromPrev: i === 0 ? 0 : 1.4,
  }));
}

beforeEach(() => {
  disk.clear();
  jest.mocked(Sharing.shareAsync).mockClear();
});

test("writes the run under its own name, with the reducer's distance, and shares that file", async () => {
  const fixes = walk();
  await exportTrack(fixes);

  const [[uri, options]] = jest.mocked(Sharing.shareAsync).mock.calls as [
    [string, { mimeType: string }],
  ];
  // Named after the first fix: exporting the same run twice overwrites one file.
  expect(uri).toBe("file:///doc/gps-tracks/bati-2026-09-20T07-00-00.gpx");
  expect(options.mimeType).toBe("application/gpx+xml");

  const distanceM = fixes.reduce(accept, EMPTY).distanceM;
  expect(distanceM).toBeGreaterThan(0);
  expect(disk.get(uri)).toBe(
    toGpx(fixes, { name: "bati-2026-09-20T07-00-00.gpx", totalDistanceM: distanceM }),
  );
});

test("hands nothing over for a run with no fixes", async () => {
  await exportTrack([]);
  expect(Sharing.shareAsync).not.toHaveBeenCalled();
  expect(disk.size).toBe(0);
});

test("a phone with no share sheet is told, rather than handed a button that does nothing", async () => {
  jest.mocked(Sharing.isAvailableAsync).mockResolvedValueOnce(false);
  await expect(exportTrack(walk())).rejects.toThrow("No share sheet");
  expect(Sharing.shareAsync).not.toHaveBeenCalled();
});
