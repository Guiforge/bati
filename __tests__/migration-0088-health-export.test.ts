import Database from "better-sqlite3";
import { migrate } from "./helpers/migrateTo";

/**
 * 0088 adds `route` and `failed` to the ledger of 0087. On a phone that ran PR 1, the rows it wrote
 * keep their meaning: Health Connect holds them at their version, without a route, not refused.
 */
test("0088 keeps every PR 1 ledger row, sent, without a route", async () => {
  const sqlite = new Database(":memory:");
  await migrate(sqlite, 87);
  sqlite
    .prepare(
      "INSERT INTO health_export (sessionUuid, version) VALUES ('a', 0), ('b', 1794812400000)",
    )
    .run();

  await migrate(sqlite);

  expect(
    sqlite.prepare("SELECT sessionUuid, version, route, failed FROM health_export").all(),
  ).toEqual([
    { sessionUuid: "a", version: 0, route: 0, failed: null },
    { sessionUuid: "b", version: 1794812400000, route: 0, failed: null },
  ]);
  sqlite.close();
});
