import { BatiP2pModule, batiP2p } from "../modules/bati-p2p";
import { makeLan } from "./helpers/nodeBatiP2p";
import { fileOf, p2pPeer } from "./helpers/p2pPeer";

/**
 * src/p2pSync.ts as deviceSync sees it, with no session open (rules S2, S3, S5, S6): what is already
 * on this device is listed and read, a write needs the other device, and kept copies stay here.
 * The sessions themselves are in p2p-session; the whole sync over P2P is in test/node/p2p.
 */
const NAME = "bati-11111111-2222-3333-4444-555555555555.batb";

test("the native module is absent from jest, and its accessor says which build lacks it", () => {
  expect(BatiP2pModule).toBeNull();
  expect(() => batiP2p()).toThrow("BatiP2p native module is not in this build");
});

test("with the module in the build, the accessor hands it over", () => {
  const native = { deviceId: jest.fn() };
  jest.isolateModules(() => {
    jest.doMock("expo", () => ({ requireOptionalNativeModule: () => native }));
    const loaded: typeof import("../modules/bati-p2p") = require("../modules/bati-p2p");
    expect(loaded.batiP2p()).toBe(native);
  });
});

describe("the P2P Remote with no session open", () => {
  test("nothing here lists nothing", async () => {
    const peer = p2pPeer(makeLan(), "A");
    const remote = peer.sync.p2pRemote({ kind: "p2p", peerId: "ab", name: "B" });
    expect(remote.id).toBe("p2p:ab");
    expect(await remote.list()).toEqual([]);
  });

  test("the file that arrived and the outbox are listed at modified 0, and what arrived reads", async () => {
    const peer = p2pPeer(makeLan(), "A");
    const { file, bytes } = fileOf(peer, 300 * 1024);
    const outbox = await peer.transfer.replaceOutbox(file, "bati-own.batb");
    // The peer's file, as a finished transfer leaves it.
    const announced = await peer.transfer.describe(file, NAME);
    const incoming = await peer.transfer.prepareIncoming(announced, NAME);
    if (incoming === null || typeof incoming === "string") throw new Error(String(incoming));
    for (let i = 0; i < announced.blocks.length; i++) {
      await peer.transfer.writeBlock(incoming, await peer.transfer.readBlock(outbox, i));
    }
    expect(await peer.transfer.finish(incoming)).toBe(true);

    const remote = peer.sync.p2pRemote({ kind: "p2p", peerId: "ab", name: "B" });
    const listed = await remote.list();
    const sha = peer.transfer.hex(announced.sha256);
    expect(listed).toEqual([
      { name: NAME, etag: sha, size: bytes.length, modified: 0 },
      { name: "bati-own.batb", etag: sha, size: bytes.length, modified: 0 },
    ]);
    const copy = new peer.fs.File(peer.fs.Paths.cache, "read.batb");
    await remote.read(NAME, copy as unknown as import("expo-file-system").File);
    expect(copy.size).toBe(bytes.length);
    await expect(
      remote.read("bati-other.batb", copy as unknown as import("expo-file-system").File),
    ).rejects.toThrow("has not arrived");
  });

  test("a write needs the other device, and a kept copy never leaves this one (S4, S5)", () => {
    const peer = p2pPeer(makeLan(), "A");
    const remote = peer.sync.p2pRemote({ kind: "p2p", peerId: "ab", name: "B" });
    const { file } = fileOf(peer, 10);
    expect(() => remote.write(file, "bati-x-kept-20261108T120000-ab12.batb")).toThrow(
      "A kept copy stays on this device",
    );
    expect(() => remote.write(file, "bati-x.batb")).toThrow("The other device is not connected");
  });

  test("copies kept before a swap: the last 3, newest first (S6)", async () => {
    const peer = p2pPeer(makeLan(), "A");
    const { file } = fileOf(peer, 10);
    for (const stamp of [
      "20261101T100000",
      "20261103T100000",
      "20261102T100000",
      "20261104T100000",
    ]) {
      await peer.sync.keepHere(file, `bati-x-kept-${stamp}-ab12.batb`);
    }
    expect(peer.sync.keptCopies().map((f) => f.name)).toEqual([
      "bati-x-kept-20261104T100000-ab12.batb",
      "bati-x-kept-20261103T100000-ab12.batb",
      "bati-x-kept-20261102T100000-ab12.batb",
    ]);
  });
});
