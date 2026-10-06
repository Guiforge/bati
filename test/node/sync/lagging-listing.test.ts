/**
 * A listing that is late: NAS boxes, some WebDAV servers and rclone's directory cache show a folder as it was a
 * while ago. On FAULTY, which hides or empties a listing on command, the app must still keep I1 to I6: no file
 * of anyone's is lost or overwritten, a server that merely looks empty is not treated as a reason to lose data, and
 * the devices agree at the next visit once the listing has caught up.
 */
import assert from "node:assert/strict";

import { type Device, newDevice, reports } from "../harness/device";
import { faulty, SERVERS, wipe } from "../harness/servers";
import {
  at,
  converge,
  HERO_PASSWORD,
  joinVault,
  startVault,
  sync,
  useDeviceClocks,
} from "../harness/world";

beforeAll(() => useDeviceClocks());

const server = SERVERS.faulty as (typeof SERVERS)[string];
let a: Device;
let b: Device;
let c: Device;

beforeEach(async () => {
  wipe(server);
  reports.length = 0;
  [a, b, c] = [await newDevice("A"), await newDevice("B"), await newDevice("C")];
});
afterEach(() => {
  faulty.clear();
  for (const d of [a, b, c]) d.close();
});

describe("a listing that hides one device's file", () => {
  test("the others keep sending, nothing is overwritten or lost, and one visit after it catches up is enough", async () => {
    const madeA = a.addSessions(3, "a");
    const madeB = b.addSessions(2, "b");
    await startVault(a, server);
    await joinVault(b, server, HERO_PASSWORD);
    await converge([a, b], [...madeA, ...madeB]);
    const [fileA, fileB] = faulty.files();
    expect(faulty.files()).toHaveLength(2);

    // B's file is left out of every listing from now on; B's own device still holds everything.
    faulty.fault({ method: "PROPFIND", action: "hide", name: fileB });
    const more = a.addSessions(2, "more");
    const bMore = b.addSessions(1, "bmore");
    await sync(a);
    await sync(b);
    await sync(a);

    // Both files are on the server, whole, and still two: no device wrote a file under the other's name.
    expect(faulty.files().sort()).toEqual([fileA, fileB].sort());
    expect(a.sessions()).toEqual(expect.arrayContaining([...madeA, ...madeB, ...more]));
    expect(b.sessions()).toEqual(expect.arrayContaining([...madeA, ...madeB, ...bMore]));

    faulty.clear();
    await converge([a, b], [...madeA, ...madeB, ...more, ...bMore], 2);
    expect(faulty.files()).toHaveLength(2);
    expect(reports.map((r) => r.context).filter((x) => !/^sync\.(peer|run)$/.test(x))).toEqual([]);
  });
});

describe("a listing that says the folder is empty while two devices' files are in it", () => {
  test("a third device that joins in that moment starts a vault of its own, and the three still end up together with nothing lost", async () => {
    const madeA = a.addSessions(3, "a");
    const madeB = b.addSessions(2, "b");
    const madeC = c.addSessions(2, "c");
    await startVault(a, server);
    await joinVault(b, server, HERO_PASSWORD);
    await converge([a, b], [...madeA, ...madeB]);
    const before = faulty.files();

    // The server answers every listing with nothing at all: to C it is an empty server (it cannot know better).
    faulty.fault({ method: "PROPFIND", action: "emptymultistatus" });
    const cPassword = "another password, long enough";
    const words = await c.app.cipher.enableEncryption(cPassword, "en");
    expect(words).toBeTruthy();
    await c.app.deviceSync.connectWebDav(server.url, "bati", "bati-test-password");
    await sync(c, { rounds: 2 }).catch(() => undefined);

    // What it must not do: touch the files that are really there.
    expect(faulty.files()).toEqual(expect.arrayContaining(before));
    for (const file of before) expect(faulty.files()).toContain(file);

    // The listing catches up. C's vault reached the server last, so it is the newer one: A and B are the devices
    // asked to join it, with the password C typed. Every session of the three survives.
    faulty.clear();
    // Whichever vault reached the server last is the one the others join (the server dates have one second
    // resolution, and the name decides on a tie): each device is given the other password, and uses it if asked.
    await sync(c, { secrets: [HERO_PASSWORD] });
    await sync(a, { secrets: [cPassword] });
    await sync(b, { secrets: [cPassword] });
    await converge([a, b, c], [...madeA, ...madeB, ...madeC], 4);
    expect(faulty.files()).toHaveLength(3);
  });
});

describe("a listing that shows a file that is not there", () => {
  test("is a device that cannot be read, never a reason to stop sending, and nothing is made of it", async () => {
    const madeA = a.addSessions(2, "a");
    const madeB = b.addSessions(2, "b");
    await startVault(a, server);
    await joinVault(b, server, HERO_PASSWORD);
    await converge([a, b], [...madeA, ...madeB]);

    faulty.fault({
      method: "PROPFIND",
      action: "ghost",
      name: "bati-0190a000-0000-7000-8000-0000000000aa.batb",
    });
    const more = a.addSessions(1, "more");
    await sync(a);
    await converge([a, b], [...madeA, ...madeB, ...more], 3);
    expect(faulty.files()).toHaveLength(2);
  });
});

describe("a listing that lags around a password change and around a forgotten device", () => {
  /** A and B on one vault, both holding everything and both having sent (B's file is sealed under the same key). */
  async function bChangesPasswordFirstFile() {
    const madeA = a.addSessions(2, "a");
    const madeB = b.addSessions(2, "b");
    await startVault(a, server);
    await joinVault(b, server, HERO_PASSWORD);
    await converge([a, b], [...madeA, ...madeB]);
    const nameOf = (d: Device) => at(d, async () => d.app.ids.fileFor(await d.app.ids.installId()));
    return { fileA: await nameOf(a), fileB: await nameOf(b) };
  }

  /** A and B on one vault, B then on a new key and sending: A sees B's file as a vault it must join. */
  async function bChangesPassword() {
    const madeA = a.addSessions(2, "a");
    const madeB = b.addSessions(2, "b");
    await startVault(a, server);
    await joinVault(b, server, HERO_PASSWORD);
    await converge([a, b], [...madeA, ...madeB]);
    await at(b, () => b.app.cipher.changePassword("a brand new password, long enough", "en"));
    await sync(b);
    const nameOf = (d: Device) => at(d, async () => d.app.ids.fileFor(await d.app.ids.installId()));
    return { fileA: await nameOf(a), fileB: await nameOf(b) };
  }

  test("a device the hero forgot stays forgotten when its file is missing from one listing", async () => {
    const { fileB, fileA } = await bChangesPassword();
    // B's vault is the newer one: A is the device that joins it.
    faulty.mtime(fileA, 1_700_000_000);
    faulty.mtime(fileB, 1_700_000_600);
    const first = await at(a, () => a.app.deviceSync.syncNow({ snapshotFirst: true }));
    const peer = first.peers.find((p) => p.name === fileB);
    assert(peer);
    expect(peer.state).toBe("locked");
    await at(a, () => a.app.deviceSync.forgetPeer({ name: peer.name, etag: peer.etag }));

    faulty.fault({ method: "PROPFIND", action: "hide", name: fileB });
    await at(a, () => a.app.deviceSync.syncNow({ snapshotFirst: false }));
    faulty.clear();
    const after = await at(a, () => a.app.deviceSync.syncNow({ snapshotFirst: false }));

    expect(after.peers.map((p) => p.name)).not.toContain(fileB);
  });

  test("a device whose own file is missing from the listing is not asked to join a vault the other must join", async () => {
    const { fileA, fileB } = await bChangesPassword();
    // A moves to a key of its own after B did: A's vault is the newer one, so B is the device that joins A.
    await at(a, () => a.app.cipher.changePassword("yet another long password", "en"));
    await sync(a);
    faulty.mtime(fileB, 1_700_000_000);
    faulty.mtime(fileA, 1_700_000_600);

    faulty.fault({ method: "PROPFIND", action: "hide", name: fileA });
    const seen = await at(a, () => a.app.deviceSync.syncNow({ snapshotFirst: false }));

    expect(seen.peers.find((p) => p.name === fileB)?.state).not.toBe("locked");
  });

  test("a vault this device left that the server dates as new as its own does not split the two for good", async () => {
    // Found by the random nights: A moves to a new password, and B's last file is as new as A's first new one
    // (the server's dates have one second). B reads A's file as 'the older vault' and waits for A to join its own,
    // A has left that vault and never will: both stay as they are.
    const { fileA, fileB } = await bChangesPasswordFirstFile();
    // B sends one more session while still on the old key: its file is the last one written, under the old vault.
    const lateB = b.addSessions(1, "blate");
    await sync(b);
    const aPassword = "the first device's new password";
    await at(a, () => a.app.cipher.changePassword(aPassword, "en"));
    const lateA = a.addSessions(1, "alate");
    await sync(a);
    // A's file was written this second or the one before; B's is dated one second after it, so B's vault looks the
    // newer one. A's own file is left alone: changing its date would make its own-file repair send it again.
    const sent = Math.floor(Date.now() / 1000);
    faulty.mtime(fileB, sent + 1);
    await new Promise((resolve) => setTimeout(resolve, 2200));

    // A sees its old vault is the newer file: it sends its own again, which is now the newest, and B joins it.
    await sync(a);
    await sync(b, { secrets: [aPassword] });
    await converge(
      [a, b],
      [...new Set([...a.sessions(), ...b.sessions(), ...lateA, ...lateB])],
      4,
      {
        secrets: [aPassword],
      },
    );

    expect(a.sessions()).toEqual(expect.arrayContaining([...lateA, ...lateB]));
    expect(b.sessions()).toEqual(expect.arrayContaining([...lateA, ...lateB]));
    expect(faulty.files().sort()).toEqual([fileA, fileB].sort());
  });
});
