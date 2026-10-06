/**
 * A `fetch` made of Node's own http, for the harness. The preset's `fetch` is React Native's XHR polyfill,
 * which answers nothing against a real server in Node, and the app's WebDAV client is real HTTP.
 *
 * It follows redirects as an HTTP stack on a phone does: 301, 302 and 303 become a GET with no body (which
 * is how a MOVE sent to an expired login page ends as a 200), 307 and 308 keep the method.
 */
import http from "node:http";
import https from "node:https";

type Init = {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  signal?: AbortSignal;
};

class NodeResponse {
  readonly status: number;
  readonly headers: { get: (name: string) => string | null };
  private readonly data: Buffer;
  constructor(status: number, raw: http.IncomingHttpHeaders, data: Buffer) {
    this.status = status;
    this.data = data;
    this.headers = {
      get: (name) => {
        const value = raw[name.toLowerCase()];
        return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
      },
    };
  }
  get ok() {
    return this.status >= 200 && this.status < 300;
  }
  text() {
    return Promise.resolve(this.data.toString("utf8"));
  }
  json() {
    return Promise.resolve(JSON.parse(this.data.toString("utf8")));
  }
  arrayBuffer() {
    return Promise.resolve(
      this.data.buffer.slice(this.data.byteOffset, this.data.byteOffset + this.data.byteLength),
    );
  }
}

type Got = { status: number; raw: http.IncomingHttpHeaders; data: Buffer };

/**
 * One request. A pooled connection the server (or toxiproxy, when a test cuts the way) closed meanwhile fails
 * its first write with "socket hang up"; OkHttp, on the phone, silently retries that on a fresh connection,
 * so this does too, once, and only when the dead socket was a reused one.
 */
async function once(url: string, init: Init): Promise<Got> {
  try {
    return await attempt(url, init);
  } catch (error) {
    // Never again once the request's own deadline has fired: a signal that already aborted cannot abort the retry.
    if (!(error instanceof StaleSocket) || init.signal?.aborted) throw error;
    return attempt(url, init);
  }
}

class StaleSocket extends Error {}

function attempt(url: string, init: Init): Promise<Got> {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const client = target.protocol === "https:" ? https : http;
    const payload =
      init.body === undefined || init.body === null
        ? null
        : typeof init.body === "string"
          ? Buffer.from(init.body)
          : Buffer.from(init.body as Uint8Array);
    // A length, never chunked: the recording proxy in front of the servers does not read a chunked body.
    const headers = {
      ...init.headers,
      ...(payload ? { "Content-Length": String(payload.length) } : {}),
    };
    let answered = false;
    const request = client.request(
      target,
      { method: init.method ?? "GET", headers, rejectUnauthorized: false },
      (response) => {
        answered = true;
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () =>
          resolve({
            status: response.statusCode ?? 0,
            raw: response.headers,
            data: Buffer.concat(chunks),
          }),
        );
        response.on("error", reject);
      },
    );
    request.on("error", (error) => {
      const failure = new Error(
        `Network request failed: ${error.message} (${init.method ?? "GET"} ${url})`,
      );
      reject(request.reusedSocket && !answered ? new StaleSocket(failure.message) : failure);
    });
    init.signal?.addEventListener("abort", () => request.destroy(new Error("aborted")));
    request.end(payload ?? undefined);
  });
}

export async function nodeFetch(url: string, init: Init = {}): Promise<NodeResponse> {
  let current = url;
  let method = init.method ?? "GET";
  let body = init.body;
  for (let hops = 0; hops < 6; hops++) {
    const got = await once(current, { ...init, method, body });
    const location = got.raw.location;
    if ([301, 302, 303, 307, 308].includes(got.status) && location) {
      current = new URL(location, current).toString();
      if (got.status !== 307 && got.status !== 308) {
        method = "GET";
        body = undefined;
      }
      continue;
    }
    return new NodeResponse(got.status, got.raw, got.data);
  }
  throw new Error("Network request failed: too many redirects");
}

(globalThis as unknown as { fetch: typeof nodeFetch }).fetch = nodeFetch;
