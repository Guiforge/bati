import { fakeHealthConnect } from "./helpers/fakeHealthConnect";
import { brokenInvariants, healthJournal } from "./helpers/healthExportJournal";
import { clientMock, createTestDb } from "./helpers/testDb";

/**
 * Two thousand past entries, a third of them outings with a route: the run finishes, yields to the
 * UI between batches, sends each entry once, newest first. Its duration goes in the PR; it is the
 * pipeline's own cost (SQLite, mapper, ledger) against an instant Health Connect, so on a phone the
 * IPC to Health Connect comes on top.
 */
describe("a 2,000-entry history", () => {
  const t = createTestDb();
  const j = healthJournal(t);

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
  });
  afterAll(() => t.close());

  const sync = () =>
    require("../src/healthExport/sync") as typeof import("../src/healthExport/sync");

  test("finishes, in batches, with every entry sent once", async () => {
    const ENTRIES = 2000;
    const uuids: string[] = [];
    for (let i = 0; i < ENTRIES; i++) {
      const minutesAgo = (i + 1) * 300;
      const entry =
        i % 3 === 0
          ? await j.outing((["walk", "run", "ride"] as const)[(i / 3) % 3] ?? "walk", minutesAgo, {
              points: 30,
            })
          : await j.quest(minutesAgo, [10 + (i % 20), 8]);
      uuids.push(entry.uuid);
    }

    const hc = fakeHealthConnect();
    expect(await sync().turnHealthExportOn(hc.port)).toBe(true);
    expect(await sync().turnHealthRouteOn(hc.port)).toBe(true);
    await sync().startHealthHistory();
    const timers = jest.spyOn(global, "setTimeout");

    const started = performance.now();
    await sync().syncHealthConnect(hc.port);
    const seconds = (performance.now() - started) / 1000;

    const yields = timers.mock.calls.filter(([, ms]) => ms === 0).length;
    timers.mockRestore();
    // The figure the PR quotes.
    process.stdout.write(
      `history: ${ENTRIES} entries in ${seconds.toFixed(1)} s, ${yields} yields, ${hc.calls.upsert} calls, batch ${sync().HEALTH_EXPORT_BATCH}\n`,
    );

    expect(hc.records.size).toBe(ENTRIES);
    expect(hc.writes).toHaveLength(ENTRIES);
    // Newest first: the journal was built newest first.
    expect(hc.writes).toEqual(uuids.map((uuid) => `bati-${uuid}`));
    expect(yields).toBeGreaterThanOrEqual(ENTRIES / sync().HEALTH_EXPORT_BATCH);
    expect([...hc.records.values()].filter((r) => r.route !== null)).toHaveLength(
      Math.ceil(ENTRIES / 3),
    );
    expect(await sync().readHealthExportState(hc.port)).toMatchObject({
      history: { running: false, done: ENTRIES, total: ENTRIES, left: 0 },
    });
    expect(await brokenInvariants(t, hc)).toEqual([]);
  }, 300_000);
});
