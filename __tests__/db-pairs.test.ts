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

describe("pairing by link", () => {
  /** Phone B's database, for the length of `work`: the same code, a second file of rows. */
  async function asPhoneB<T>(work: () => Promise<T>): Promise<T> {
    const phoneA = t;
    t = createTestDb();
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
    try {
      return await work();
    } finally {
      t.close();
      t = phoneA;
      jest.resetModules();
      jest.doMock("../db/client", () => clientMock(t));
    }
  }

  const waiting = () => t.sqlite.prepare("SELECT * FROM pair_invites").all() as { id: string }[];
  const madeInvite = async () => {
    const made = await pairs().createLinkInvite();
    assert(typeof made === "object");
    return made;
  };
  /** B accepts on its own database and hands back the answer, and the pair B wrote. */
  const answered = (invite: Awaited<ReturnType<typeof madeInvite>>) =>
    asPhoneB(async () => {
      const answer = await pairs().acceptLinkInvite(invite, "Inviter");
      assert(answer instanceof Uint8Array);
      const [pair] = await pairs().listPairs();
      assert(pair);
      return { answer, pair };
    });

  test("A writes no pair and no secret until an answer comes, only a key that waits", async () => {
    const invite = await madeInvite();
    expect(await pairs().listPairs()).toEqual([]);
    expect(waiting()).toHaveLength(1);
    expect(JSON.stringify(invite)).not.toContain("privateKey");
  });

  test("both phones end with the same key, each knowing the other's id, and the key is gone", async () => {
    const invite = await madeInvite();
    const { answer, pair: onB } = await answered(invite);

    await expect(pairs().replyStanding(answer)).resolves.toBe("ok");
    // Reading an answer changes nothing.
    expect(await pairs().listPairs()).toEqual([]);
    expect(waiting()).toHaveLength(1);

    await expect(pairs().completeLinkInvite(answer, "  Lou  ")).resolves.toBe("paired");

    const [onA] = await pairs().listPairs();
    expect(onA).toMatchObject({
      id: invite.pairId,
      name: "Lou",
      selfId: invite.senderId,
      peerId: onB.selfId,
      secret: onB.secret,
    });
    expect(onB.peerId).toBe(invite.senderId);
    expect(waiting()).toEqual([]);
  });

  test("a second answer to the same invitation finds nothing to open with", async () => {
    const invite = await madeInvite();
    const first = await answered(invite);
    const second = await answered(invite);
    await pairs().completeLinkInvite(first.answer, "Lou");
    const held = (await pairs().listPairs())[0]?.secret;

    await expect(pairs().completeLinkInvite(second.answer, "Eve")).resolves.toBe("known");

    expect(await pairs().listPairs()).toHaveLength(1);
    expect((await pairs().listPairs())[0]).toMatchObject({ name: "Lou", secret: held });
  });

  test("an altered answer writes nothing and keeps the key waiting", async () => {
    const invite = await madeInvite();
    const { answer } = await answered(invite);
    const altered = answer.slice();
    altered[40] = (altered[40] ?? 0) ^ 1;

    await expect(pairs().replyStanding(altered)).resolves.toBe("refused");
    await expect(pairs().completeLinkInvite(altered, "Eve")).resolves.toBe("refused");

    expect(await pairs().listPairs()).toEqual([]);
    expect(waiting()).toHaveLength(1);
  });

  test("an answer to an invitation this phone never made is refused", async () => {
    const elsewhere = await asPhoneB(madeInvite);
    const { answer } = await answered(elsewhere);
    await expect(pairs().completeLinkInvite(answer, "Eve")).resolves.toBe("refused");
  });

  test("a hero opening their own invitation changes nothing", async () => {
    const invite = await madeInvite();
    await expect(pairs().acceptLinkInvite(invite, "Me")).resolves.toBe("known");
    expect(await pairs().listPairs()).toEqual([]);
  });

  test("a forged public key yields no pair on B", async () => {
    const invite = await madeInvite();
    const forged = { ...invite, publicKey: Buffer.alloc(32).toString("base64") };
    await asPhoneB(async () => {
      await expect(pairs().acceptLinkInvite(forged, "Eve")).resolves.toBe("refused");
      expect(await pairs().listPairs()).toEqual([]);
    });
  });

  test("seven days on, the key is deleted whatever happens, and a late answer is refused", async () => {
    const invite = await madeInvite();
    const { answer } = await answered(invite);
    const eightDays = new Date(Date.now() + 8 * 86_400_000);

    await pairs().sweepExpiredInvites(new Date(Date.now() + 6 * 86_400_000));
    expect(waiting()).toHaveLength(1);

    const now = jest.spyOn(Date, "now").mockReturnValue(eightDays.getTime());
    const clock = jest.useFakeTimers({ doNotFake: ["nextTick", "setImmediate", "queueMicrotask"] });
    clock.setSystemTime(eightDays);
    await expect(pairs().completeLinkInvite(answer, "Late")).resolves.toBe("refused");
    jest.useRealTimers();
    now.mockRestore();

    await pairs().sweepExpiredInvites(eightDays);
    expect(waiting()).toEqual([]);
    expect(await pairs().listPairs()).toEqual([]);
  });

  test("at most five waiting, and a full phone refuses an answer without losing its key", async () => {
    for (const i of [1, 2, 3, 4, 5]) await pairs().createPair(`p${i}`);
    const invite = await madeInvite();
    const { answer } = await answered(invite);
    await expect(pairs().completeLinkInvite(answer, "six")).resolves.toBe("full");
    expect(waiting()).toHaveLength(1);

    for (const _ of [1, 2, 3, 4]) await madeInvite();
    await expect(pairs().createLinkInvite()).resolves.toBe("full");
  });

  test("a failed write carries neither the private key nor the pair's secret", async () => {
    t.sqlite.exec("DROP TABLE pair_invites");
    t.sqlite.exec(
      "CREATE TABLE pair_invites (id text, privateKey text, selfId text, madeAt int, CHECK (id = 'never'))",
    );
    const failure = await pairs()
      .createLinkInvite()
      .then(
        () => null,
        (error: Error) => error,
      );
    assert(failure instanceof Error);
    expect(failure.message).toContain("Writing a pair failed");
    expect(failure.message).not.toMatch(/[A-Za-z0-9+/]{43}=/);
  });

  test("a waiting key never reaches a plain backup, and sync does not carry it", async () => {
    await madeInvite();
    const file = path.join(dir, "plain.db");
    await backup().snapshotDatabaseTo(file);
    await backup().scrubPairs(file);
    const copy = new Database(file);
    expect(copy.prepare("SELECT count(*) AS n FROM pair_invites").get()).toEqual({ n: 0 });
    copy.close();
    const key = (
      t.sqlite.prepare("SELECT privateKey FROM pair_invites").get() as { privateKey: string }
    ).privateKey;
    expect(fs.readFileSync(file).includes(key)).toBe(false);

    const peer = await peerFile((sqlite) => {
      sqlite
        .prepare(
          "INSERT INTO pair_invites (id, privateKey, selfId, madeAt) VALUES ('other', 'k', 's', 1)",
        )
        .run();
    });
    await merge().mergePeer(peer);
    expect(waiting().map((row) => row.id)).not.toContain("other");
  });
});

describe("the door a code came through", () => {
  const read = () =>
    require("../src/multiplayer/received") as typeof import("../src/multiplayer/received");
  const { linkFor } =
    require("../src/multiplayer/link") as typeof import("../src/multiplayer/link");

  test("an invite holding a secret opens from the camera and is refused from a link", async () => {
    const { encodeInvite } =
      require("../src/multiplayer/invite") as typeof import("../src/multiplayer/invite");
    const code = linkFor(encodeInvite(invite({ madeAt: Math.floor(Date.now() / 1000) })));
    await expect(read().readCode(code, "scan")).resolves.toMatchObject({ kind: "invite" });
    const refused = await read().readCode(code, "link");
    expect(refused.kind).toBe("unreadable");
    expect(JSON.stringify(refused)).not.toContain(SECRET);
  });

  test("an invitation with no secret opens from both", async () => {
    const { encodeLinkInvite } =
      require("../src/multiplayer/linkInvite") as typeof import("../src/multiplayer/linkInvite");
    const made = await pairs().createLinkInvite();
    assert(typeof made === "object");
    const code = linkFor(encodeLinkInvite(made));
    await expect(read().readCode(code, "link")).resolves.toMatchObject({ kind: "linkInvite" });
    await expect(read().readCode(code, "scan")).resolves.toMatchObject({ kind: "linkInvite" });
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
