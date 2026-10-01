/**
 * `transactionOrFallback` on the phone, where every save that writes more than one row relies on
 * it: a session and its sets, boss damage, an oath, an imported quest.
 *
 * The stand-ins below behave as the real ones do. Drizzle's expo driver runs a transaction
 * synchronously: BEGIN, call the callback, COMMIT, so an async callback is committed at its first
 * `await`, before any of its writes. expo-sqlite's `withTransactionAsync` waits for the callback.
 * Every statement lands in one log, and the log is what the tests read: a write that happens after
 * COMMIT is a write no rollback can take back.
 *
 * The rest of the suite runs on better-sqlite3, which takes the fallback and cannot see any of this.
 */
const mockLog: string[] = [];

jest.mock("expo-file-system", () => ({
  File: class {
    exists = false;
  },
}));

jest.mock("expo-sqlite", () => ({
  defaultDatabaseDirectory: "/data",
  deleteDatabaseSync: jest.fn(),
  openDatabaseAsync: jest.fn(),
  openDatabaseSync: () => ({
    execSync: () => undefined,
    withTransactionAsync: async (task: () => Promise<void>) => {
      mockLog.push("BEGIN");
      try {
        await task();
        mockLog.push("COMMIT");
      } catch (error) {
        mockLog.push("ROLLBACK");
        throw error;
      }
    },
  }),
}));

jest.mock("drizzle-orm/expo-sqlite", () => ({
  drizzle: () => ({
    // drizzle-orm/expo-sqlite/session.js, in four lines.
    transaction(fn: (tx: unknown) => unknown) {
      mockLog.push("begin");
      const result = fn(this);
      mockLog.push("commit");
      return result;
    },
  }),
}));

import { transactionOrFallback } from "@/db/client";

/** A write as the callers make them: after an await, the way every Drizzle statement resolves. */
async function write(name: string): Promise<void> {
  await Promise.resolve();
  mockLog.push(name);
}

beforeEach(() => {
  mockLog.length = 0;
});

test("every write lands between the transaction's BEGIN and its COMMIT", async () => {
  await transactionOrFallback(async () => {
    await write("movement");
    await write("quest");
  });

  // The probe that decides whether async transactions are supported runs once, first.
  const own = mockLog.slice(mockLog.indexOf("BEGIN"));
  expect(own).toEqual(["BEGIN", "movement", "quest", "COMMIT"]);
});

test("a failure after the first write rolls that write back", async () => {
  await expect(
    transactionOrFallback(async () => {
      await write("movement");
      throw new Error("disk full");
    }),
  ).rejects.toThrow("disk full");

  expect(mockLog).toEqual(["BEGIN", "movement", "ROLLBACK"]);
});

test("returns what the body returned", async () => {
  await expect(transactionOrFallback(async () => 42)).resolves.toBe(42);
});
