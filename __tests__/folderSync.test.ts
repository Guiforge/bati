/**
 * Sync through a folder Syncthing replicates. The fake stands for a Storage Access Framework tree:
 * entries are content URIs whose document id carries the path, and what was done is recorded.
 * Asserted: names read from those URIs, and a write that never leaves a half-written file under
 * the name other devices read.
 */

const mockOps: string[] = [];
const mockTree = new Map<string, { size: number; modificationTime: number }>();
const TREE = "content://com.android.externalstorage.documents/tree/primary%3ASyncthing%2FBati";
const docUri = (name: string) =>
  `content://com.android.externalstorage.documents/tree/primary%3ASyncthing%2FBati/document/primary%3ASyncthing%2FBati%2F${encodeURIComponent(name)}`;

jest.mock("expo-file-system", () => {
  class File {
    uri: string;
    constructor(dirOrUri: { uri: string } | string, name?: string) {
      this.uri = typeof dirOrUri === "string" ? dirOrUri : `${dirOrUri.uri}/${name}`;
    }
    get exists() {
      return false;
    }
    info() {
      const name = decodeURIComponent(this.uri).split("/").pop() ?? "";
      const entry = mockTree.get(name);
      return { size: entry?.size ?? 0, modificationTime: entry?.modificationTime ?? 0 };
    }
    copy(destination: { uri: string }) {
      const name = decodeURIComponent(this.uri).split("/").pop() ?? "";
      mockOps.push(`copy ${name} -> ${destination.uri.startsWith("content") ? "tree" : "local"}`);
      if (destination.uri.startsWith("content")) {
        mockTree.set(name, { size: 10, modificationTime: 5 });
      }
      return Promise.resolve();
    }
    delete() {
      const name = decodeURIComponent(this.uri).split("/").pop() ?? "";
      mockOps.push(`delete ${name}`);
      if (this.uri.startsWith("content")) mockTree.delete(name);
    }
    rename(next: string) {
      const name = decodeURIComponent(this.uri).split("/").pop() ?? "";
      mockOps.push(`rename ${name} -> ${next}`);
      const entry = mockTree.get(name);
      mockTree.delete(name);
      if (entry) mockTree.set(next, entry);
    }
  }
  class Directory {
    uri: string;
    constructor(uri: string) {
      this.uri = uri;
    }
    list() {
      return [...mockTree.keys()].map((name) => new File(docUri(name)));
    }
  }
  return { File, Directory, Paths: { cache: { uri: "file:///cache" } } };
});

import { File } from "expo-file-system";

import { folderLabel, folderRemote } from "@/src/folderSync";

beforeEach(() => {
  mockOps.length = 0;
  mockTree.clear();
});

test("files are listed by the name at the end of their document id, versioned by time and size", async () => {
  mockTree.set("bati-a.batb", { size: 100, modificationTime: 1_000 });
  mockTree.set(".syncthing.bati-b.batb.tmp", { size: 3, modificationTime: 2_000 });
  const files = await folderRemote(TREE).list();
  expect(files).toEqual([
    { name: "bati-a.batb", etag: "1000|100", modified: 1_000 },
    // Listed, and left out by the peer pattern like any other name that is not a device's file.
    { name: ".syncthing.bati-b.batb.tmp", etag: "2000|3", modified: 2_000 },
  ]);
});

test("a write goes in under Syncthing's staging name, then replaces the old file by rename", async () => {
  mockTree.set("bati-a.batb", { size: 100, modificationTime: 1_000 });
  await folderRemote(TREE).write(new File("file:///db/bati-sync-out.batb"), "bati-a.batb");
  expect(mockOps).toEqual([
    "copy bati-sync-out.batb -> local",
    "copy .syncthing.bati-a.batb.tmp -> tree",
    "delete .syncthing.bati-a.batb.tmp",
    "delete bati-a.batb",
    "rename .syncthing.bati-a.batb.tmp -> bati-a.batb",
  ]);
  expect([...mockTree.keys()]).toEqual(["bati-a.batb"]);
});

test("the folder's own name is what the Settings row says", () => {
  expect(folderLabel(TREE)).toBe("Bati");
});
