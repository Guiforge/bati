describe("db/client", () => {
  test("resetDatabase calls expo-sqlite deleteDatabaseSync", async () => {
    jest.resetModules();

    const deleteDatabaseSync = jest.fn();
    const execSync = jest.fn();
    const openDatabaseSync = jest.fn(() => ({ dummy: true, execSync }));

    jest.doMock("expo-sqlite", () => ({
      deleteDatabaseSync,
      openDatabaseSync,
    }));

    const drizzle = jest.fn(() => ({ dummyDb: true }));
    jest.doMock("drizzle-orm/expo-sqlite", () => ({ drizzle }));

    const client = require("../db/client") as typeof import("../db/client");
    const expectedDbName = `bati.v${client.SCHEMA_VERSION}.db`;

    // module init should open the DB and create drizzle instance
    expect(openDatabaseSync).toHaveBeenCalledWith(expectedDbName, {
      enableChangeListener: true,
    });
    expect(drizzle).toHaveBeenCalled();

    // WAL and a wait, on the connection itself. Neither was set before `vacuumIntoFile` opened a
    // second connection, and without WAL that reader blocked the app's own writes — the first
    // backup produced `database is locked` from the chorus. A pragma nobody asserts is a pragma
    // that quietly stops being applied.
    const pragmas = execSync.mock.calls.map(([sql]) => String(sql)).join(" ");
    expect(pragmas).toContain("journal_mode = WAL");
    expect(pragmas).toContain("busy_timeout");

    await client.resetDatabase();
    expect(deleteDatabaseSync).toHaveBeenCalledWith(expectedDbName);
  });
});
