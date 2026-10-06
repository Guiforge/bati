/**
 * The connection test asks the server one thing at a time and stops at the first it refuses. Each
 * answer below is what a real server gave in some report: a healthy one, a Nextcloud that does not
 * know the account, a 400 on the listing with Sabre's reason, a certificate Android does not trust.
 */
let mockAnswers: Record<string, { status: number; body?: string } | Error> = {};
const mockCalls: string[] = [];

jest.mock("expo-file-system", () => ({ File: class {}, UploadType: { BINARY_CONTENT: 0 } }));

const SABRE_400 =
  '<d:error xmlns:d="DAV:" xmlns:s="http://sabredav.org/ns"><s:message>Invalid path</s:message></d:error>';

beforeEach(() => {
  mockCalls.length = 0;
  mockAnswers = {};
  global.fetch = jest.fn((url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    const path = new URL(String(url)).pathname;
    mockCalls.push(`${method} ${path}`);
    const answer = mockAnswers[`${method} ${path}`] ?? mockAnswers[method] ?? { status: 200 };
    if (answer instanceof Error) return Promise.reject(answer);
    return Promise.resolve(new Response(answer.body ?? null, { status: answer.status }));
  }) as unknown as typeof fetch;
});

import { diagnoseServer, failureOf, nextcloudTarget, webdavTarget } from "@/src/cloudSync";

const dav = webdavTarget("https://dav.test/root", "hero", "p");
const account = {
  server: "https://cloud.test",
  loginName: "a@b.org",
  userId: "hero",
  appPassword: "p",
};

const ids = (steps: { id: string; ok: boolean }[]) =>
  steps.map((s) => `${s.id}:${s.ok ? "ok" : "fail"}`);

describe("diagnoseServer", () => {
  test("a healthy WebDAV server passes every step, and the test file is removed", async () => {
    mockAnswers = { MKCOL: { status: 405 }, PROPFIND: { status: 207 }, PUT: { status: 201 } };

    const steps = await diagnoseServer(dav);

    expect(ids(steps)).toEqual(["reach:ok", "folder:ok", "list:ok", "write:ok"]);
    expect(mockCalls.at(-2)).toBe("PUT /root/Bati/bati-diagnostic.upload");
    expect(mockCalls.at(-1)).toBe("DELETE /root/Bati/bati-diagnostic.upload");
  });

  test("a Nextcloud account is asked about too, and about its own address", async () => {
    mockAnswers = { MKCOL: { status: 405 }, PROPFIND: { status: 207 }, PUT: { status: 201 } };

    const steps = await diagnoseServer(nextcloudTarget(account), account);

    expect(ids(steps)).toEqual(["reach:ok", "account:ok", "folder:ok", "list:ok", "write:ok"]);
    expect(mockCalls[0]).toBe("GET /status.php");
    expect(mockCalls).toContain("GET /ocs/v2.php/cloud/user");
  });

  test("a 400 on the listing stops there and keeps the server's own reason", async () => {
    mockAnswers = { MKCOL: { status: 405 }, PROPFIND: { status: 400, body: SABRE_400 } };

    const steps = await diagnoseServer(dav);

    expect(ids(steps)).toEqual(["reach:ok", "folder:ok", "list:fail"]);
    expect(steps.at(-1)).toMatchObject({ status: 400, kind: "server", reason: "Invalid path" });
    expect(mockCalls.some((c) => c.startsWith("PUT"))).toBe(false);
  });

  test("an account the server refuses stops before the folder is touched", async () => {
    mockAnswers = { "GET /ocs/v2.php/cloud/user": { status: 401 } };

    const steps = await diagnoseServer(nextcloudTarget(account), account);

    expect(ids(steps)).toEqual(["reach:ok", "account:fail"]);
    expect(steps.at(-1)).toMatchObject({ status: 401, kind: "credentials" });
    expect(mockCalls.some((c) => c.startsWith("MKCOL"))).toBe(false);
  });

  test("a server that does not say who the account is is not a failure: the path has no id", async () => {
    mockAnswers = {
      "GET /ocs/v2.php/cloud/user": { status: 404 },
      MKCOL: { status: 405 },
      PROPFIND: { status: 207 },
      PUT: { status: 201 },
    };

    const steps = await diagnoseServer(nextcloudTarget({ ...account, userId: undefined }), account);

    expect(ids(steps)).toEqual(["reach:ok", "account:fail", "folder:ok", "list:ok", "write:ok"]);
  });

  test("a certificate Android does not trust is said at the first step, as that", async () => {
    mockAnswers = { GET: new Error("java.security.cert.CertPathValidatorException: Trust anchor") };

    const steps = await diagnoseServer(dav);

    expect(steps).toEqual([{ id: "reach", ok: false, kind: "certificate" }]);
  });

  test("a server that cannot be reached is offline, with no status", async () => {
    mockAnswers = { GET: new Error("Network request failed") };

    expect(await diagnoseServer(dav)).toEqual([{ id: "reach", ok: false, kind: "offline" }]);
  });

  test("a full account is told apart at the write", async () => {
    mockAnswers = { MKCOL: { status: 405 }, PROPFIND: { status: 207 }, PUT: { status: 507 } };

    const steps = await diagnoseServer(dav);

    expect(steps.at(-1)).toMatchObject({ id: "write", ok: false, status: 507, kind: "storage" });
    expect(mockCalls.some((c) => c.startsWith("DELETE"))).toBe(false);
  });
});

describe("diagnoseServer, the folder step", () => {
  test.each([405, 409])("a MKCOL answered %i is a folder already there", async (status) => {
    mockAnswers = { MKCOL: { status }, PROPFIND: { status: 207 }, PUT: { status: 201 } };

    const steps = await diagnoseServer(dav);

    expect(ids(steps)).toEqual(["reach:ok", "folder:ok", "list:ok", "write:ok"]);
  });

  test("a MKCOL the server refuses stops there, with its reason, and never lists or writes", async () => {
    mockAnswers = { MKCOL: { status: 403, body: SABRE_400 } };

    const steps = await diagnoseServer(dav);

    expect(ids(steps)).toEqual(["reach:ok", "folder:fail"]);
    expect(steps.at(-1)).toMatchObject({
      status: 403,
      kind: "credentials",
      reason: "Invalid path",
    });
    expect(mockCalls.some((c) => c.startsWith("PROPFIND") || c.startsWith("PUT"))).toBe(false);
  });
});

describe("failureOf", () => {
  test("a thrown value that is not an Error is read by its text", () => {
    expect(failureOf("Network request failed")).toEqual({ kind: "offline" });
    expect(failureOf("SSLHandshakeException")).toEqual({ kind: "certificate" });
    expect(failureOf(42)).toEqual({ kind: "unknown" });
  });
});
