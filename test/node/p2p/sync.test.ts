/**
 * Two of the hero's devices syncing directly (docs/designs/p2p-sync/PLAN.md, node X1 to X12, X29): the app's
 * real sync, cipher, merge and database on each, the P2P protocol for real between them over TLS on loopback,
 * and a shared "Wi-Fi" that records every byte it carries. No server anywhere.
 */
import { makeLan } from "../../../__tests__/helpers/nodeBatiP2p";
import { readCode } from "../../../src/p2p/code";
import type { Link } from "../../../src/p2p/link";
import type { SessionView } from "../../../src/p2p/session";
import { type Device, newDevice, reports } from "../harness/device";
import { converge, HERO_PASSWORD, plainDatabasesOutside, sync } from "../harness/world";

const devices: Device[] = [];
afterEach(() => {
  for (const d of devices.splice(0)) d.close();
  reports.length = 0;
});

async function make(name: string, lan = makeLan()) {
  const device = await newDevice(name, undefined, lan);
  devices.push(device);
  return device;
}

function until<T>(read: () => T | undefined, what: string, ms = 20_000): Promise<T> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const look = () => {
      const value = read();
      if (value !== undefined) resolve(value);
      else if (Date.now() - started > ms) reject(new Error(`never: ${what}`));
      else setTimeout(look, 20);
    };
    look();
  });
}

/** The pairing of SPEC.md L4 on both screens, each making the link its sync account as the app does. */
async function pair(a: Device, b: Device): Promise<void> {
  const views: SessionView[] = [];
  const linked = (device: Device) => async (link: Link) => {
    await device.app.deviceSync.connectP2p(link);
  };
  const shown = a.app.p2p.session.openSession(
    { kind: "show" },
    { onChange: (v) => views.push(v), onLinked: linked(a) },
  );
  const code = await until(() => views.find((v) => v.step === "code"), "a code");
  if (code.step !== "code") throw new Error("no code");
  const read = readCode(code.text, Math.floor(Date.now() / 1000));
  if (!read.ok) throw new Error(read.reason);
  const scanning = b.app.p2p.session.openSession(
    { kind: "scan", code: read.code },
    { onLinked: linked(b) },
  );
  await until(() => views.find((v) => v.step === "confirm"), "the confirmation on A");
  await shown.confirm(true);
  await until(() => (b.secure.has("bati.p2p.link") ? true : undefined), "B linked");
  shown.cancel();
  scanning.cancel();
}

/** Both devices open the sync sheet: two sessions, until `close`. */
async function openBoth(a: Device, b: Device) {
  const linkA = await a.app.p2p.link.readLink();
  const linkB = await b.app.p2p.link.readLink();
  if (!linkA || !linkB) throw new Error("not linked");
  const onA = a.app.p2p.session.openSession({ kind: "sync", link: linkA });
  const onB = b.app.p2p.session.openSession({ kind: "sync", link: linkB });
  return {
    close: () => {
      onA.cancel();
      onB.cancel();
    },
  };
}

async function joinOverP2p(device: Device): Promise<void> {
  const state = await device.app.deviceSync.serverState();
  if (state.kind !== "needsSecret")
    throw new Error(`expected a password question, got ${JSON.stringify(state)}`);
  if (!(await device.app.deviceSync.joinPeer(state.peer, HERO_PASSWORD)))
    throw new Error("join refused");
}

describe("sync over P2P, with the app's real data code on both devices", () => {
  test("a new phone links, learns the password, and gets the whole history (A1, A10, L4b)", async () => {
    const lan = makeLan();
    const phone = await make("phone", lan);
    const tablet = await make("tablet", lan);
    await phone.app.cipher.enableEncryption(HERO_PASSWORD, "en");
    const history = phone.addSessions(6, "phone");
    await pair(phone, tablet);
    expect((await phone.app.deviceSync.syncAccount())?.kind).toBe("p2p");
    expect((await tablet.app.deviceSync.syncAccount())?.kind).toBe("p2p");

    const sheets = await openBoth(phone, tablet);
    await sync(phone);
    await joinOverP2p(tablet);
    await converge([phone, tablet], history, 6, { secrets: [HERO_PASSWORD] });
    sheets.close();
    expect(plainDatabasesOutside(tablet)).toEqual([]);
  });

  test("a tablet that trained before linking keeps its session through the merge (S1b, A11)", async () => {
    const lan = makeLan();
    const phone = await make("phone", lan);
    const tablet = await make("tablet", lan);
    await phone.app.cipher.enableEncryption(HERO_PASSWORD, "en");
    const onPhone = phone.addSessions(3, "phone");
    const onTablet = tablet.addSessions(1, "tablet");
    await pair(phone, tablet);
    const sheets = await openBoth(phone, tablet);
    await sync(phone);
    await joinOverP2p(tablet);
    expect(
      await converge([phone, tablet], [...onPhone, ...onTablet], 6, { secrets: [HERO_PASSWORD] }),
    ).toBeGreaterThan(0);
    sheets.close();
  });

  test("sessions added later on both sides meet at the next visit (B1, B5)", async () => {
    const lan = makeLan();
    const phone = await make("phone", lan);
    const tablet = await make("tablet", lan);
    await phone.app.cipher.enableEncryption(HERO_PASSWORD, "en");
    const first = phone.addSessions(2, "first");
    await pair(phone, tablet);
    let sheets = await openBoth(phone, tablet);
    await sync(phone);
    await joinOverP2p(tablet);
    await converge([phone, tablet], first, 6, { secrets: [HERO_PASSWORD] });
    sheets.close();

    const later = [...phone.addSessions(2, "phoneLater"), ...tablet.addSessions(2, "tabletLater")];
    sheets = await openBoth(phone, tablet);
    expect(
      await converge([phone, tablet], [...first, ...later], 6, { secrets: [HERO_PASSWORD] }),
    ).toBeGreaterThan(0);
    sheets.close();
  });

  test("with no sheet open, a sync run says nothing and changes nothing (S7)", async () => {
    const lan = makeLan();
    const phone = await make("phone", lan);
    const tablet = await make("tablet", lan);
    await phone.app.cipher.enableEncryption(HERO_PASSWORD, "en");
    await pair(phone, tablet);
    await expect(phone.app.deviceSync.syncNow({ snapshotFirst: true })).rejects.toThrow(
      "The other device is not connected",
    );
    expect(phone.app.p2p.transfer.outbox()).toBeNull();
  });

  test("the Wi-Fi never carries a name, an installId or a session in the clear (P1, X29)", async () => {
    const lan = makeLan();
    const phone = await make("phone", lan);
    const tablet = await make("tablet", lan);
    await phone.app.cipher.enableEncryption(HERO_PASSWORD, "en");
    const history = phone.addSessions(4, "secretSessionTag");
    await pair(phone, tablet);
    const sheets = await openBoth(phone, tablet);
    await sync(phone);
    await joinOverP2p(tablet);
    await converge([phone, tablet], history, 6, { secrets: [HERO_PASSWORD] });
    sheets.close();

    const air = Buffer.concat(lan.seen);
    expect(air.length).toBeGreaterThan(10_000);
    const ids = [await phone.app.ids.installId(), await tablet.app.ids.installId()];
    for (const needle of ["phone", "tablet", "secretSessionTag", "SQLite format 3", ...ids]) {
      expect(air.includes(Buffer.from(needle))).toBe(false);
    }
  });
});
