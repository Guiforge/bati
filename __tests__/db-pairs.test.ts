import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import Database from "better-sqlite3";

import { batiCrypto } from "../modules/bati-crypto";
import { nodeBatiCrypto } from "./helpers/nodeBatiCrypto";
import { clientMock, createTestDb } from "./helpers/testDb";

/**
 * Companions through the real migrations, the real `mergePeer` and `compareWithPeer`, on SQLite
 * files. The two rules that matter: a secret reaches a file only sealed, and an unlinked pair does
 * not come back from the hero's other device.
 */
jest.mock("../modules/bati-crypto", () => ({ batiCrypto: jest.fn() }));

let t: ReturnType<typeof createTestDb>;
let dir: string;

beforeEach(() => {
  jest.resetModules();
  jest.mocked(batiCrypto).mockReturnValue(nodeBatiCrypto);
  jest.doMock("../modules/bati-crypto", () => ({ batiCrypto: () => nodeBatiCrypto }));
  t = createTestDb();
  jest.doMock("../db/client", () => clientMock(t));
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "bati-pairs-"));
});

afterEach(() => {
  t.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

const pairs = () => require("../db/pairs") as typeof import("../db/pairs");
const backup = () => require("../db/backup") as typeof import("../db/backup");
const merge = () => require("../db/merge") as typeof import("../db/merge");

const ID = "00112233445566778899aabbccddeeff";
const SECRET = Buffer.alloc(32, 7).toString("base64");

const invite = (over = {}) => ({
  pairId: ID,
  senderId: "a1a2a3a4a5a6a7a8",
  madeAt: 1793750400,
  secret: SECRET,
  ...over,
});

function row(sqlite: Database.Database, id: string, name: string, at: number) {
  sqlite
    .prepare(
      `INSERT INTO pairs (id, secret, name, selfId, peerId, createdAt, updatedAt)
       VALUES (?, ?, ?, 'b1b2b3b4b5b6b7b8', NULL, ?, ?)`,
    )
    .run(id, SECRET, name, at, at);
}

async function peerFile(fill: (sqlite: Database.Database) => void): Promise<string> {
  const file = path.join(dir, `peer-${Math.random()}.db`);
  await backup().snapshotDatabaseTo(file);
  const peer = new Database(file);
  fill(peer);
  peer.close();
  return file;
}

const local = () =>
  t.sqlite.prepare("SELECT * FROM pairs ORDER BY id").all() as {
    id: string;
    name: string;
    updatedAt: number;
  }[];

describe("creating and accepting", () => {
  test("the inviter's row has a fresh secret, 32 bytes, and no peer yet", async () => {
    const made = await pairs().createPair("  Sam  ");
    assert(typeof made === "object");
    expect(Buffer.from(made.secret, "base64")).toHaveLength(32);
    const [stored] = await pairs().listPairs();
    expect(stored).toMatchObject({
      id: made.pairId,
      name: "Sam",
      peerId: null,
      selfId: made.senderId,
    });
  });

  test("two invites never share a secret or an id", async () => {
    const [a, b] = [await pairs().createPair("a"), await pairs().createPair("b")];
    assert(typeof a === "object" && typeof b === "object");
    expect(a.secret).not.toBe(b.secret);
    expect(a.pairId).not.toBe(b.pairId);
  });

  test("accepting stores the inviter as the peer, and a name that is the receiver's own", async () => {
    await expect(pairs().acceptInvite(invite(), "Ma soeur")).resolves.toBe("paired");
    const [stored] = await pairs().listPairs();
    expect(stored).toMatchObject({
      id: ID,
      secret: SECRET,
      name: "Ma soeur",
      peerId: "a1a2a3a4a5a6a7a8",
    });
    expect(stored?.selfId).not.toBe("a1a2a3a4a5a6a7a8");
  });

  test("scanning your own invite, or one you already hold, changes nothing", async () => {
    const made = await pairs().createPair("Sam");
    assert(typeof made === "object");
    await expect(pairs().acceptInvite(made, "Me")).resolves.toBe("known");
    expect((await pairs().listPairs())[0]?.name).toBe("Sam");
  });

  test("at most five, from either side", async () => {
    for (const i of [1, 2, 3, 4, 5]) await pairs().createPair(`p${i}`);
    await expect(pairs().createPair("six")).resolves.toBe("full");
    await expect(pairs().acceptInvite(invite(), "six")).resolves.toBe("full");
    expect(await pairs().listPairs()).toHaveLength(pairs().MAX_PAIRS);
  });
});

describe("a failed write", () => {
  test("says what failed and carries no secret, since its message can reach a feedback mail", async () => {
    await pairs().acceptInvite(invite(), "Sam");
    // Nothing the public functions let through: a table changed under them.
    t.sqlite.exec("DROP TABLE pairs");
    t.sqlite.exec(
      "CREATE TABLE pairs (id text, secret text, name text, selfId text, peerId text, createdAt int, updatedAt int, CHECK (id = 'never'))",
    );
    const failure = await pairs()
      .acceptInvite(invite({ pairId: "ff".repeat(16) }), "Lou")
      .then(
        () => null,
        (error: Error) => error,
      );
    assert(failure instanceof Error);
    expect(failure.message).toContain("Writing a pair failed");
    expect(failure.message).not.toContain(SECRET);
    expect(failure.stack).not.toContain(SECRET);
  });
});

describe("unlinking", () => {
  test("removes the secret and leaves a tombstone, in one tap", async () => {
    await pairs().acceptInvite(invite(), "Sam");
    await pairs().unlinkPair(ID);
    expect(await pairs().listPairs()).toEqual([]);
    expect(t.sqlite.prepare("SELECT uuid FROM deleted_content").all()).toEqual([{ uuid: ID }]);
  });

  test("leaves the connection as it found it: overwriting every delete would slow the whole app", async () => {
    await pairs().acceptInvite(invite(), "Sam");
    await pairs().unlinkPair(ID);
    expect(t.sqlite.pragma("secure_delete", { simple: true })).toBe(0);
  });

  test("the same invite can be taken again after", async () => {
    await pairs().acceptInvite(invite(), "Sam");
    await pairs().unlinkPair(ID);
    await expect(pairs().acceptInvite(invite(), "Sam")).resolves.toBe("paired");
  });
});

describe("a plain backup never holds a secret", () => {
  test("the rows are gone and no byte of the key is left in the file", async () => {
    await pairs().acceptInvite(invite(), "Sam");
    const file = path.join(dir, "plain.db");
    await backup().snapshotDatabaseTo(file);
    // The snapshot alone does hold it: this test can fail.
    expect(fs.readFileSync(file).includes(SECRET)).toBe(true);

    await backup().scrubPairs(file);

    expect(fs.readFileSync(file).includes(SECRET)).toBe(false);
    const copy = new Database(file);
    expect(copy.prepare("SELECT count(*) AS n FROM pairs").get()).toEqual({ n: 0 });
    copy.close();
  });
});

describe("a copy from before the table existed", () => {
  // The pre-migration copy is taken on the old schema: throwing here would lose the safety net on
  // the very update that adds the table.
  test("scrubbing it is a no-op, not a failure", async () => {
    const file = path.join(dir, "old.db");
    await backup().snapshotDatabaseTo(file);
    const old = new Database(file);
    old.exec("DROP TABLE pairs");
    old.close();
    await expect(backup().scrubPairs(file)).resolves.toBeUndefined();
  });
});

describe("sync between the hero's own devices", () => {
  test("a pair the other device made arrives whole, secret and all, and reads as news", async () => {
    const file = await peerFile((peer) => row(peer, ID, "Sam", 1000));
    expect((await backup().compareWithPeer(file)).peerChanges).toBe(1);
    await expect(merge().mergePeer(file)).resolves.toMatchObject({ merged: true });
    expect(t.sqlite.prepare("SELECT secret FROM pairs").all()).toEqual([{ secret: SECRET }]);
    expect((await backup().compareWithPeer(file)).peerChanges).toBe(0);
  });

  test("the later stamp wins, and an older copy changes nothing", async () => {
    row(t.sqlite, ID, "Old", 1000);
    const newer = await peerFile((peer) =>
      peer.prepare("UPDATE pairs SET name = 'New', updatedAt = 2000").run(),
    );
    await merge().mergePeer(newer);
    expect(local()[0]?.name).toBe("New");

    const older = await peerFile((peer) =>
      peer.prepare("UPDATE pairs SET name = 'Older', updatedAt = 500").run(),
    );
    await merge().mergePeer(older);
    expect(local()[0]?.name).toBe("New");
  });

  test("a tie settles the same way the comparison reads it, so it never reads as diverged", async () => {
    row(t.sqlite, ID, "Aaa", 1000);
    const file = await peerFile((peer) => peer.prepare("UPDATE pairs SET name = 'Bbb'").run());
    await merge().mergePeer(file);
    expect(local()[0]?.name).toBe("Bbb");
    const comparison = await backup().compareWithPeer(file);
    expect(comparison.peerChanges + comparison.localChanges).toBe(0);
  });

  test("a pair unlinked on the other device goes here too, and does not come back", async () => {
    row(t.sqlite, ID, "Sam", 1000);
    const file = await peerFile((peer) => {
      peer.prepare("DELETE FROM pairs").run();
      peer.prepare("INSERT INTO deleted_content (uuid, deletedAt) VALUES (?, 2000)").run(ID);
    });
    await merge().mergePeer(file);
    await merge().honourTombstones();
    expect(local()).toEqual([]);
  });

  test("a pair unlinked here is not brought back by the other device's older copy", async () => {
    const file = await peerFile((peer) => row(peer, ID, "Sam", 1000));
    t.sqlite.prepare("INSERT INTO deleted_content (uuid, deletedAt) VALUES (?, 2000)").run(ID);
    await merge().mergePeer(file);
    expect(local()).toEqual([]);
    expect((await backup().compareWithPeer(file)).peerChanges).toBe(0);
  });

  test("a new pair moves the fingerprint, so sync uploads it", async () => {
    const before = await backup().stateFingerprint();
    row(t.sqlite, ID, "Sam", 1000);
    expect(await backup().stateFingerprint()).not.toBe(before);
  });
});
