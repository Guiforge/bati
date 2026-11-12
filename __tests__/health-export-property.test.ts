import fc from "fast-check";
import type { HealthRecord } from "../src/healthExport/port";
import { type FakeHealthConnect, fakeHealthConnect } from "./helpers/fakeHealthConnect";
import { brokenInvariants, healthJournal } from "./helpers/healthExportJournal";
import { clientMock, createTestDb } from "./helpers/testDb";

/**
 * Random lives of a hero, as sequences of what can happen to the journal, the switches and Android,
 * with the export running in between. Whatever the order, six things hold:
 *
 * 1. never two records for one entry (Health Connect holds exactly the sent entries);
 * 2. no record for an entry deleted in the journal, once the queue is empty;
 * 3. every record equals the mapper's output for the entry as it is now, once the queue is empty;
 * 4. nothing is written while the switch is off or the permission is missing;
 * 5. no entry received through sync is written outside a history run;
 * 6. no route exists for an outing sent while the route option was off.
 *
 * 4 to 6 are checked at the moment of each write, by the fake; 1 to 3 at the end.
 */
const simple = <K extends string>(kind: K, weight: number) => ({
  arbitrary: fc.constant({ kind }),
  weight,
});

const action = fc.oneof(
  { arbitrary: fc.record({ kind: fc.constant("quest" as const), past: fc.boolean() }), weight: 4 },
  {
    arbitrary: fc.record({
      kind: fc.constant("outing" as const),
      past: fc.boolean(),
      locomotion: fc.constantFrom("walk" as const, "run" as const, "ride" as const),
      points: fc.constantFrom(0, 8),
    }),
    weight: 4,
  },
  {
    arbitrary: fc.record({ kind: fc.constant("syncIn" as const), outing: fc.boolean() }),
    weight: 2,
  },
  { arbitrary: fc.record({ kind: fc.constant("correct" as const), pick: fc.nat() }), weight: 3 },
  { arbitrary: fc.record({ kind: fc.constant("remove" as const), pick: fc.nat() }), weight: 3 },
  simple("switchOn", 4),
  simple("switchOff", 1),
  simple("routeOn", 2),
  simple("routeOff", 1),
  simple("permissionRemoved", 1),
  simple("permissionGranted", 2),
  simple("routePermissionRemoved", 1),
  simple("startHistory", 2),
  simple("stopHistory", 1),
  simple("killAndRestart", 1),
  simple("sync", 5),
);

type Action = typeof action extends fc.Arbitrary<infer A> ? A : never;

describe("Health Connect export: properties", () => {
  const t = createTestDb();
  const j = healthJournal(t);

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
  });
  afterAll(() => t.close());

  const sync = () =>
    require("../src/healthExport/sync") as typeof import("../src/healthExport/sync");
  const pref = (key: string) =>
    (
      t.sqlite.prepare("SELECT value FROM user_preferences WHERE key = ?").get(key) as
        | { value: string }
        | undefined
    )?.value ?? null;
  const ledgerRow = (uuid: string) =>
    t.sqlite.prepare("SELECT route FROM health_export WHERE sessionUuid = ?").get(uuid) as
      | { route: number }
      | undefined;
  const origin = (uuid: string) =>
    (
      t.sqlite.prepare("SELECT originDevice FROM completed_sessions WHERE uuid = ?").get(uuid) as
        | { originDevice: string }
        | undefined
    )?.originDevice;

  function reset() {
    t.sqlite.exec(
      "DELETE FROM completed_exercises; DELETE FROM completed_sessions; DELETE FROM health_export; DELETE FROM gps_points;",
    );
    t.sqlite.exec("DELETE FROM user_preferences WHERE key LIKE 'health%'");
  }

  /** Invariants 4, 5 and 6, read at the moment a write reaches Health Connect. */
  function watch(hc: FakeHealthConnect, broken: string[]) {
    hc.state.onUpsert = (record: HealthRecord) => {
      const uuid = record.id.replace(/^bati-/, "");
      if (pref("healthExportSince") === null) broken.push(`written while off: ${record.id}`);
      const first = ledgerRow(uuid) === undefined;
      const mine = origin(uuid) === pref("deviceId");
      if (first && !mine && pref("healthHistoryRunning") !== "1") {
        broken.push(`synced-in entry written outside a history run: ${record.id}`);
      }
      const routeAllowed = first ? pref("healthExportRoute") === "1" : ledgerRow(uuid)?.route === 1;
      if (record.route !== null && !routeAllowed) broken.push(`route sent while off: ${record.id}`);
      return undefined;
    };
  }

  type Life = { hc: FakeHealthConnect; ids: number[] };
  type Handlers = {
    [K in Action["kind"]]: (a: Extract<Action, { kind: K }>, life: Life) => unknown;
  };
  const DAYS_4 = 4 * 24 * 60;
  const on = () => pref("healthExportSince") !== null;
  const pick = ({ ids }: Life, n: number) => ids[n % Math.max(ids.length, 1)];

  const handlers: Handlers = {
    quest: async (a, { ids }) => ids.push((await j.quest(a.past ? DAYS_4 : 0)).id),
    outing: async (a, { ids }) =>
      ids.push((await j.outing(a.locomotion, a.past ? DAYS_4 : 0, { points: a.points })).id),
    syncIn: async (a, { ids }) => {
      const { id } = a.outing ? await j.outing("ride", 0) : await j.quest(0);
      j.fromOtherPhone(id);
      ids.push(id);
    },
    correct: (a, life) => {
      const id = pick(life, a.pick);
      if (id !== undefined) j.correctedElsewhere(id);
    },
    remove: async (a, life) => {
      const id = pick(life, a.pick);
      if (id === undefined) return;
      life.ids.splice(life.ids.indexOf(id), 1);
      await j.remove(id);
    },
    switchOn: (_, { hc }) => sync().turnHealthExportOn(hc.port),
    switchOff: () => sync().turnHealthExportOff(),
    routeOn: (_, { hc }) => on() && sync().turnHealthRouteOn(hc.port),
    routeOff: () => sync().turnHealthRouteOff(),
    permissionRemoved: (_, { hc }) => {
      hc.state.permitted = false;
    },
    permissionGranted: (_, { hc }) => {
      hc.state.permitted = true;
    },
    routePermissionRemoved: (_, { hc }) => {
      hc.state.routePermitted = false;
    },
    startHistory: () => on() && sync().startHealthHistory(),
    stopHistory: () => sync().stopHealthHistory(),
    // Dies after the next write lands, before the ledger hears of it; then a new process.
    killAndRestart: async (_, { hc }) => {
      hc.state.hangAfterWrites = hc.writes.length + 1;
      sync()
        .syncHealthConnect(hc.port)
        .catch(() => undefined);
      await new Promise((resolve) => setTimeout(resolve, 30));
      hc.state.hangAfterWrites = Number.POSITIVE_INFINITY;
      jest.resetModules();
      jest.doMock("../db/client", () => clientMock(t));
    },
    sync: (_, { hc }) =>
      sync()
        .syncHealthConnect(hc.port)
        .catch(() => undefined),
  };

  const apply = (a: Action, life: Life) =>
    (handlers[a.kind] as (a: Action, life: Life) => unknown)(a, life);

  test("the six invariants hold after any sequence", async () => {
    // What the generated lives actually did, so a property that never writes cannot pass as proof.
    const seen = { writes: 0, routes: 0, syncedIn: 0, removed: 0 };
    await fc.assert(
      fc.asyncProperty(
        fc.array(action, { minLength: 8, maxLength: 30, size: "max" }),
        async (actions) => {
          reset();
          jest.resetModules();
          jest.doMock("../db/client", () => clientMock(t));
          const hc = fakeHealthConnect();
          const broken: string[] = [];
          watch(hc, broken);
          const life: Life = { hc, ids: [] };
          for (const a of actions) await apply(a, life);

          // Empty the queue: the permission back, the switch on (a switch already on keeps its
          // date), and one full run.
          hc.state.permitted = true;
          await sync().turnHealthExportOn(hc.port);
          await sync().syncHealthConnect(hc.port);
          broken.push(...(await brokenInvariants(t, hc)));
          seen.writes += hc.writes.length;
          seen.routes += [...hc.records.values()].filter((r) => r.route !== null).length;
          seen.syncedIn += hc.writes.filter((id) => origin(id.slice(5)) === "their-phone").length;
          seen.removed += hc.calls.remove;
          expect(broken).toEqual([]);
          // The fake never saw a write without the permission it needs (invariant 4).
          expect(hc.calls.forbidden).toBe(0);
        },
      ),
      { numRuns: 200, seed: Number(process.env.FC_SEED ?? 20261112), verbose: 1 },
    );
    // The figures go in the PR: they show the property is not vacuous.
    process.stdout.write(`property: ${JSON.stringify(seen)}\n`);
    expect(seen.writes).toBeGreaterThan(300);
    expect(seen.routes).toBeGreaterThan(10);
    expect(seen.syncedIn).toBeGreaterThan(10);
    expect(seen.removed).toBeGreaterThan(10);
  }, 120_000);
});
