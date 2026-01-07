describe("db/client", () => {
  test("resetDatabase calls expo-sqlite deleteDatabaseSync", async () => {
    jest.resetModules();

    const deleteDatabaseSync = jest.fn();
    const openDatabaseSync = jest.fn(() => ({ dummy: true }));

    jest.doMock("expo-sqlite", () => ({
      deleteDatabaseSync,
      openDatabaseSync,
    }));

    const drizzle = jest.fn(() => ({ dummyDb: true }));
    jest.doMock("drizzle-orm/expo-sqlite", () => ({ drizzle }));

    // Mock __DEV__ to false for consistent test behavior
    (global as { __DEV__: boolean }).__DEV__ = false;

    const client = require("../src/db/client") as typeof import("../src/db/client");

    // module init should open the DB and create drizzle instance
    expect(openDatabaseSync).toHaveBeenCalledWith("bati.db", {
      enableChangeListener: true,
    });
    expect(drizzle).toHaveBeenCalled();

    await client.resetDatabase();
    expect(deleteDatabaseSync).toHaveBeenCalledWith("bati.db");
  });
});
