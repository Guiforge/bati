import type { File } from "expo-file-system";

import { uploadRemote } from "@/src/cloudSync";

/**
 * A PUT cut off halfway used to leave a truncated file under the device's own name, which every
 * other device then read as unreadable until the next upload. The file goes up under a `.part`
 * name no device reads, and a MOVE puts it in place.
 */

const TARGET = { folderUrl: "https://dav.test/Bati", user: "hero", password: "p" };
const FINAL = "https://dav.test/Bati/bati-a.batb";

const calls: string[] = [];

function serverAnswersMove(status: number) {
  global.fetch = jest.fn((url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    const destination = (init?.headers as Record<string, string> | undefined)?.Destination;
    calls.push(destination ? `${method} ${url} -> ${destination}` : `${method} ${url}`);
    const answer = method === "MOVE" ? status : method === "MKCOL" ? 405 : 204;
    return Promise.resolve({ ok: answer >= 200 && answer < 300, status: answer });
  }) as unknown as typeof fetch;
}

const source = {
  upload: (url: string) => {
    calls.push(`PUT ${url}`);
    return Promise.resolve({ status: 201 });
  },
} as unknown as File;

beforeEach(() => {
  calls.length = 0;
});

test("the file goes up under a name no device reads, then moves into place", async () => {
  serverAnswersMove(201);
  await uploadRemote(TARGET, source, "bati-a.batb");
  expect(calls.slice(1)).toEqual([`PUT ${FINAL}.part`, `MOVE ${FINAL}.part -> ${FINAL}`]);
});

test("a server without MOVE still gets the file, the direct way", async () => {
  serverAnswersMove(405);
  await uploadRemote(TARGET, source, "bati-a.batb");
  expect(calls.slice(1)).toEqual([
    `PUT ${FINAL}.part`,
    `MOVE ${FINAL}.part -> ${FINAL}`,
    `PUT ${FINAL}`,
    `DELETE ${FINAL}.part`,
  ]);
});

test("a MOVE the server refuses for another reason is a failed upload", async () => {
  serverAnswersMove(507);
  await expect(uploadRemote(TARGET, source, "bati-a.batb")).rejects.toThrow("HTTP 507");
});
