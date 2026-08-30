/**
 * The contract this file defends is a privacy one as much as a correctness one: crashes are
 * written to the local database and nowhere else, and the only way one leaves the device is a
 * `mailto:` the hero opens, reads and sends themselves.
 */

import assert from "node:assert/strict";

const mockStore = new Map<string, string>();

jest.mock("@/db/client", () => ({ getRawDb: () => ({}) }));
jest.mock("@/db/preferences", () => ({
  getPreference: (key: string) => Promise.resolve(mockStore.get(key) ?? null),
  setPreference: (key: string, value: string) => {
    mockStore.set(key, value);
    return Promise.resolve();
  },
}));

import {
  type BugReportStrings,
  buildBugReportMailto,
  CONTACT_EMAIL,
  type CrashReport,
  clearCrashLog,
  installCrashHandler,
  readCrashLog,
  readErrorLog,
  recordCrash,
  recordHandledError,
} from "@/src/crashLog";
import { reportError } from "@/src/reportError";

/** Lets the error-log write queue (microtasks + one macrotask) drain. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("crashLog", () => {
  beforeEach(() => {
    mockStore.clear();
  });

  test("records a crash with its message and stack", async () => {
    await recordCrash("render", new Error("boom"));

    const [report] = await readCrashLog();
    assert(report);
    expect(report.context).toBe("render");
    expect(report.message).toBe("boom");
    expect(report.stack).toContain("boom");
    expect(Date.parse(report.at)).not.toBeNaN();
  });

  test("a thrown non-Error still records something usable", async () => {
    await recordCrash("fatal", "just a string");

    expect((await readCrashLog())[0]?.message).toBe("just a string");
  });

  test("keeps the newest crashes first and caps the log", async () => {
    for (let i = 0; i < 8; i++) {
      await recordCrash("render", new Error(`crash ${i}`));
    }

    const reports = await readCrashLog();
    expect(reports).toHaveLength(5);
    expect(reports[0]?.message).toBe("crash 7");
    expect(reports.at(-1)?.message).toBe("crash 3");
  });

  test("a very long stack is truncated rather than stored whole", async () => {
    const err = new Error("deep");
    err.stack = "x".repeat(20_000);

    await recordCrash("fatal", err);

    expect((await readCrashLog())[0]?.stack?.length).toBeLessThanOrEqual(4000);
  });

  test("a corrupt log is replaced rather than throwing", async () => {
    mockStore.set("crashLog", "{not json");

    await recordCrash("render", new Error("after corruption"));

    const reports = await readCrashLog();
    expect(reports).toHaveLength(1);
    expect(reports[0]?.message).toBe("after corruption");
  });

  test("clearing empties the log", async () => {
    await recordCrash("render", new Error("boom"));
    await clearCrashLog();

    expect(await readCrashLog()).toEqual([]);
  });

  test("two identical crashes merge into one entry that counts", async () => {
    await recordCrash("render", new Error("boom"));
    await recordCrash("render", new Error("boom"));

    const reports = await readCrashLog();
    expect(reports).toHaveLength(1);
    expect(reports[0]?.count).toBe(2);
  });

  describe("handled errors", () => {
    // The path the app actually calls: `reportError` → sink → error log. Testing
    // `recordHandledError` alone would pass with the sink never installed.
    test("reportError lands in the error log once the handler is installed", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
      installCrashHandler();

      reportError("backup.save", new Error("Unable to open output stream"));
      await flush();

      const [entry] = await readErrorLog();
      assert(entry);
      expect(entry.context).toBe("backup.save");
      expect(entry.message).toBe("Unable to open output stream");
      // No stacks on breadcrumbs: the context+message pair names the call site.
      expect(entry.stack).toBeNull();
      consoleSpy.mockRestore();
    });

    test("two errors reported in the same tick both land, newest first", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
      installCrashHandler();

      reportError("widget.update", new Error("first"));
      reportError("session.save", new Error("second"));
      await flush();

      const entries = await readErrorLog();
      expect(entries.map((e) => e.message)).toEqual(["second", "first"]);
      consoleSpy.mockRestore();
    });

    test("a repeating error becomes one entry whose count grows and whose time moves", async () => {
      for (let i = 0; i < 25; i++) {
        await recordHandledError("backup.auto", new Error("grant revoked"));
      }

      const entries = await readErrorLog();
      expect(entries).toHaveLength(1);
      expect(entries[0]?.count).toBe(25);
      expect(Date.parse(entries[0]?.at ?? "")).not.toBeNaN();
    });

    test("distinct errors cap at twenty, newest first", async () => {
      for (let i = 0; i < 25; i++) {
        await recordHandledError("backup.auto", new Error(`failure ${i}`));
      }

      const entries = await readErrorLog();
      expect(entries).toHaveLength(20);
      expect(entries[0]?.message).toBe("failure 24");
    });

    test("a chatty error can never evict a crash — the two logs are separate rows", async () => {
      await recordCrash("fatal", new Error("the one crash that matters"));
      for (let i = 0; i < 25; i++) {
        await recordHandledError("widget.update", new Error(`noise ${i}`));
      }

      expect((await readCrashLog())[0]?.message).toBe("the one crash that matters");
    });

    test("an enormous message is cut to one line's worth", async () => {
      await recordHandledError("backup.save", new Error("x".repeat(5000)));

      expect((await readErrorLog())[0]?.message.length).toBeLessThanOrEqual(300);
    });
  });

  describe("the global handler", () => {
    const globalAny = globalThis as unknown as { ErrorUtils?: unknown };
    const original = globalAny.ErrorUtils;

    afterEach(() => {
      globalAny.ErrorUtils = original;
    });

    // Swallowing the previous handler would trade a visible crash for a silent one — in dev it
    // is what draws the red box.
    test("chains to the handler it replaced", () => {
      const previous = jest.fn();
      // An array rather than a `let`: TypeScript narrows a variable only assigned inside a
      // callback to `never`, and the assertion below still has to call it.
      const installed: ((error: unknown, isFatal?: boolean) => void)[] = [];
      globalAny.ErrorUtils = {
        getGlobalHandler: () => previous,
        setGlobalHandler: (h: (error: unknown, isFatal?: boolean) => void) => {
          installed.push(h);
        },
      };

      installCrashHandler();
      const err = new Error("fatal boom");
      installed[0]?.(err, true);

      expect(previous).toHaveBeenCalledWith(err, true);
    });

    test("does nothing when the runtime has no ErrorUtils", () => {
      globalAny.ErrorUtils = undefined;
      expect(() => installCrashHandler()).not.toThrow();
    });
  });

  describe("the bug report mail", () => {
    const reports: CrashReport[] = [
      { at: "2026-07-31T10:00:00.000Z", context: "render", message: "boom", stack: "at foo()" },
    ];

    /** The screen passes these through `t`; the module itself holds no wording. */
    const strings: BugReportStrings = {
      subject: "Bati 1.0.0 — retour",
      prompt: "Dis-moi tout",
      technicalHeader: "Détails techniques",
      noCrash: "Aucun plantage enregistré sur cet appareil.",
      errorsHeader: "Erreurs récentes",
      noErrors: "Aucune erreur récente enregistrée.",
    };

    test("is a mailto to the contact address, carrying the crash", () => {
      const url = buildBugReportMailto(reports, [], "1.0.0 (7)", strings);

      expect(url.startsWith(`mailto:${CONTACT_EMAIL}?`)).toBe(true);
      expect(decodeURIComponent(url)).toContain("boom");
      expect(decodeURIComponent(url)).toContain("at foo()");
      expect(decodeURIComponent(url)).toContain("Bati 1.0.0 (7)");
    });

    // The wording travels from the caller, so a French hero writes a French mail.
    test("carries the caller's wording, not a hardcoded English draft", () => {
      const url = decodeURIComponent(buildBugReportMailto(reports, [], "1.0.0", strings));

      expect(url).toContain("subject=Bati 1.0.0 — retour");
      expect(url).toContain("Dis-moi tout");
      expect(url).toContain("Détails techniques");
    });

    // "It lags" is unactionable without knowing what it lagged on.
    test("names the device it was sent from", () => {
      const url = decodeURIComponent(buildBugReportMailto(reports, [], "1.0.0", strings));

      expect(url).toContain("Device: ");
    });

    // A body pasted raw into a URL breaks on the first `&` or newline.
    test("escapes the body", () => {
      const url = buildBugReportMailto(
        [{ at: "2026-07-31T10:00:00.000Z", context: "render", message: "a&b", stack: null }],
        [],
        "1.0.0",
        strings,
      );

      expect(url).not.toContain("a&b");
      expect(decodeURIComponent(url)).toContain("a&b");
    });

    test("still composes when nothing was recorded", () => {
      const url = buildBugReportMailto([], [], "1.0.0", strings);
      const body = decodeURIComponent(url);
      expect(body).toContain("Aucun plantage enregistré");
      expect(body).toContain("Aucune erreur récente enregistrée.");
    });

    test("handled errors get their own section, one line each, with the repeat count", () => {
      const handled: CrashReport[] = [
        {
          at: "2026-08-30T09:00:00.000Z",
          context: "backup.save",
          message: "Unable to create file",
          stack: null,
          count: 3,
        },
      ];

      const body = decodeURIComponent(buildBugReportMailto(reports, handled, "1.0.0", strings));

      expect(body).toContain("--- Erreurs récentes ---");
      expect(body).toContain("(backup.save ×3) — Unable to create file");
      // The crash section is still there, above it.
      expect(body).toContain("boom");
    });
  });
});
