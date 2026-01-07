/**
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";

describe("DatabaseProvider migrations import", () => {
  it("should import migrations object from drizzle", () => {
    // This test verifies the import path is correct
    const migrations = require("@/src/drizzle/migrations");

    expect(migrations.default).toBeDefined();
    expect(migrations.default.journal).toBeDefined();
    expect(migrations.default.migrations).toBeDefined();
    expect(Array.isArray(migrations.default.journal.entries)).toBe(true);
  });

  it("should have valid migration structure", () => {
    const migrations = require("@/src/drizzle/migrations");
    const { journal, migrations: migrationFiles } = migrations.default;

    expect(journal.entries.length).toBeGreaterThan(0);

    // Verify first migration exists
    const firstEntry = journal.entries[0];
    expect(firstEntry).toHaveProperty("idx");
    expect(firstEntry).toHaveProperty("when");
    expect(firstEntry).toHaveProperty("tag");

    // Verify migration file exists for first entry
    const key = `m${String(firstEntry.idx).padStart(4, "0")}`;
    expect(migrationFiles[key]).toBeDefined();
    expect(typeof migrationFiles[key]).toBe("string");
  });
});
