/**
 * An upload is only done when the server holds the file. A MOVE that answers 2xx has not always
 * moved: a redirect to a login page is re-issued as a GET by the HTTP stack and ends in a 200, and
 * some servers answer 201 and do nothing. Believing it, the app recorded "uploaded" and the stale
 * file stayed on the server until this device's history moved again.
 */
const mockCalls: string[] = [];
let mockMove = 201;
let mockPropfind: { status: number; body: string } = { status: 207, body: "" };
let mockPutStatus = 201;
let mockPutQueue: number[] = [];

jest.mock("expo-file-system", () => ({
  File: class {
    uri: string;
    constructor(uri: string) {
      this.uri = uri;
    }
    upload(url: string) {
      mockCalls.push(`PUT ${url.split("/").pop()}`);
      return Promise.resolve({ status: mockPutQueue.shift() ?? mockPutStatus });
    }
  },
  UploadType: { BINARY_CONTENT: 0 },
}));

const listing = (size?: number) =>
  `<d:multistatus xmlns:d="DAV:"><d:response><d:href>/Bati/x.batb</d:href><d:propstat><d:prop><d:getetag>"v1"</d:getetag>${
    size === undefined ? "" : `<d:getcontentlength>${size}</d:getcontentlength>`
  }</d:prop></d:propstat></d:response></d:multistatus>`;

beforeEach(() => {
  mockCalls.length = 0;
  mockMove = 201;
  mockPutStatus = 201;
  mockPutQueue = [];
  mockPropfind = { status: 207, body: listing(1000) };
  global.fetch = jest.fn((url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    mockCalls.push(`${method} ${String(url).split("/").pop()}`);
    if (method === "MKCOL") return Promise.resolve(new Response(null, { status: 405 }));
    if (method === "MOVE") return Promise.resolve(new Response(null, { status: mockMove }));
    if (method === "PROPFIND") {
      return Promise.resolve(new Response(mockPropfind.body, { status: mockPropfind.status }));
    }
    return Promise.resolve(new Response(null, { status: 204 }));
  }) as unknown as typeof fetch;
});

import { File } from "expo-file-system";

import {
  DavAuthError,
  DavHttpError,
  listRemote,
  parseListing,
  statRemote,
  uploadRemote,
} from "@/src/cloudSync";

const target = { folderUrl: "https://dav.test/Bati", user: "hero", password: "p" };
const source = Object.assign(new File("file:///db/out"), { size: 1000 }) as File;

describe("uploadRemote", () => {
  test("is done when the server answers the move and holds the file at the size sent", async () => {
    // And it says which version it now holds, to be compared with the next listing.
    await expect(uploadRemote(target, source, "x.batb")).resolves.toBe("v1");
    expect(mockCalls).toContain("PROPFIND x.batb");
  });

  test("a move answered 200 that left nothing there (a redirect to a login page) is a failed upload", async () => {
    mockMove = 200;
    mockPropfind = { status: 404, body: "" };

    await expect(uploadRemote(target, source, "x.batb")).rejects.toMatchObject({ status: 404 });
  });

  test("a move answered 201 that left a file of another size is a failed upload", async () => {
    mockPropfind = { status: 207, body: listing(0) };

    await expect(uploadRemote(target, source, "x.batb")).rejects.toBeInstanceOf(DavHttpError);
  });

  test("the temporary name is one Nextcloud accepts: it refuses every name ending in .part or .filepart", async () => {
    await uploadRemote(target, source, "x.batb");

    const names = mockCalls.filter((c) => c.startsWith("PUT") || c.startsWith("MOVE"));
    expect(names.length).toBeGreaterThan(0);
    for (const call of names) expect(call).not.toMatch(/\.(part|filepart)$/);
  });

  test("a temporary name still locked by a cut upload (423) is left alone: the retry goes under another name", async () => {
    mockPutQueue = [423];

    await expect(uploadRemote(target, source, "x.batb")).resolves.toBe("v1");

    const puts = mockCalls.filter((c) => c.startsWith("PUT"));
    expect(puts).toHaveLength(2);
    expect(puts[1]).toMatch(/^PUT x\.batb\.[0-9a-f]+\.upload$/);
    expect(mockCalls).toContain(`MOVE ${puts[1]?.slice(4)}`);
  });

  test("any other refusal of the temporary copy is the upload's failure", async () => {
    mockPutQueue = [507];

    await expect(uploadRemote(target, source, "x.batb")).rejects.toMatchObject({ status: 507 });
    expect(mockCalls.filter((c) => c.startsWith("PUT"))).toHaveLength(1);
  });

  test("a server without MOVE gets the direct write, and the same check after it", async () => {
    mockMove = 405;
    mockPropfind = { status: 207, body: listing(1000) };

    await uploadRemote(target, source, "x.batb");

    expect(mockCalls.filter((c) => c.startsWith("PUT"))).toEqual([
      "PUT x.batb.upload",
      "PUT x.batb",
    ]);
    expect(mockCalls.at(-1)).toBe("PROPFIND x.batb");
  });

  test("a server that lists no size cannot be checked, and its answer stands", async () => {
    mockPropfind = { status: 207, body: listing(undefined) };

    await expect(uploadRemote(target, source, "x.batb")).resolves.toBe("v1");
  });
});

describe("listRemote", () => {
  test("a refused listing carries what the server said, for the error trail", async () => {
    mockPropfind = {
      status: 400,
      body: '<d:error xmlns:d="DAV:" xmlns:s="http://sabredav.org/ns"><s:message>Invalid path</s:message></d:error>',
    };

    await expect(listRemote(target)).rejects.toMatchObject({
      status: 400,
      message: "Listing: HTTP 400 (Invalid path)",
    });
  });

  test("and still a plain refusal when the server says nothing", async () => {
    mockPropfind = { status: 400, body: "" };

    await expect(listRemote(target)).rejects.toMatchObject({
      status: 400,
      message: "Listing: HTTP 400",
    });
  });

  test.each([500, 502, 503, 504])(
    "a %i is an error, never an empty folder: nothing is concluded about files that may be there",
    async (status) => {
      mockPropfind = { status, body: "" };

      await expect(listRemote(target)).rejects.toMatchObject({ status });
    },
  );

  test("an empty listing the server did give is an empty folder", async () => {
    mockPropfind = { status: 207, body: '<d:multistatus xmlns:d="DAV:"></d:multistatus>' };

    await expect(listRemote(target)).resolves.toEqual([]);
  });
});

describe("uploadRemote, refusals", () => {
  test("a MOVE refused with anything but 405 or 501 is the upload's failure, with no direct write", async () => {
    mockMove = 500;

    await expect(uploadRemote(target, source, "x.batb")).rejects.toMatchObject({
      status: 500,
      message: "Upload: HTTP 500",
    });
    expect(mockCalls.filter((c) => c.startsWith("PUT"))).toEqual(["PUT x.batb.upload"]);
  });

  test("a check that the server answers with anything but 207 is a failure with that status", async () => {
    mockPropfind = { status: 500, body: "" };

    await expect(uploadRemote(target, source, "x.batb")).rejects.toMatchObject({ status: 500 });
  });
});

describe("listRemote, credentials", () => {
  test.each([401, 403])(
    "a folder creation answered %i is a credentials error before any listing",
    async (status) => {
      global.fetch = jest.fn((_url: string, init?: RequestInit) => {
        mockCalls.push(init?.method ?? "GET");
        return Promise.resolve(new Response(null, { status }));
      }) as unknown as typeof fetch;

      await expect(listRemote(target)).rejects.toBeInstanceOf(DavAuthError);
      expect(mockCalls).toEqual(["MKCOL"]);
    },
  );
});

describe("statRemote", () => {
  test("a 404 is a file that is not there", async () => {
    mockPropfind = { status: 404, body: "" };
    await expect(statRemote(target, "x.batb")).resolves.toBeNull();
  });

  test("any other answer but 207 is thrown, never read as gone", async () => {
    mockPropfind = { status: 500, body: "" };
    await expect(statRemote(target, "x.batb")).rejects.toMatchObject({
      status: 500,
      message: "Stat: HTTP 500",
    });
  });

  test("an answer that names another file is not this file", async () => {
    mockPropfind = { status: 207, body: listing(1000) };
    await expect(statRemote(target, "y.batb")).resolves.toBeNull();
    await expect(statRemote(target, "x.batb")).resolves.toMatchObject({
      name: "x.batb",
      etag: "v1",
    });
  });
});

describe("parseListing, entries that are skipped", () => {
  const entry = (href: string, props: string) =>
    `<d:response><d:href>${href}</d:href><d:propstat><d:prop>${props}</d:prop></d:propstat></d:response>`;

  test("an entry with no etag, no date and no size has no version and is not a file", () => {
    expect(parseListing(entry("/Bati/a.batb", ""))).toEqual([]);
  });

  test("an entry whose name has a malformed escape is skipped, its neighbour is kept", () => {
    const xml =
      entry("/Bati/%E0%A4%A", "<d:getetag>1</d:getetag>") +
      entry("/Bati/b.batb", "<d:getetag>2</d:getetag>");
    expect(parseListing(xml).map((f) => f.name)).toEqual(["b.batb"]);
  });
});
