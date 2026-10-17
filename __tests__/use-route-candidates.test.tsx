import { act, renderHook, waitFor } from "@testing-library/react-native";

import type { RouteShape } from "@/src/gps/route";

/** One read per outing, shared by the live map and the recap. Each test has its own uuid: the cache is module-level. */

const mockRead = jest.fn();
jest.mock("@/db/gps", () => ({ routeCandidates: (...a: unknown[]) => mockRead(...a) }));
const mockReport = jest.fn();
jest.mock("@/src/reportError", () => ({ reportError: (...a: unknown[]) => mockReport(...a) }));

import { useRouteCandidates } from "@/hooks/useRouteCandidates";

const start = { lat: 48.85, lon: 2.35 };
const shapes: RouteShape[] = [{ id: "p", performedAt: new Date(0), points: [start] }];

beforeEach(() => {
  mockRead.mockReset();
  mockReport.mockReset();
  mockRead.mockResolvedValue(shapes);
});

test("the live map, then the recap of the same outing: one read, both get the shapes", async () => {
  const live = await renderHook(() => useRouteCandidates("run", start, 1_000, "u-reuse"));
  await waitFor(() => expect(live.result.current).toEqual(shapes));

  const recap = await renderHook(() => useRouteCandidates("run", start, 2_000, "u-reuse"));
  await waitFor(() => expect(recap.result.current).toEqual(shapes));
  expect(mockRead).toHaveBeenCalledTimes(1);
  expect(mockRead).toHaveBeenCalledWith("run", start, new Date(1_000), "u-reuse");
});

test("another outing reads again, and never shows the previous one's answer", async () => {
  const { result, rerender } = await renderHook(
    ({ id }: { id: string }) => useRouteCandidates("run", start, 1, id),
    { initialProps: { id: "u-one" } },
  );
  await waitFor(() => expect(result.current).toEqual(shapes));
  let resolve: (v: RouteShape[]) => void = () => undefined;
  mockRead.mockReturnValue(
    new Promise<RouteShape[]>((r) => {
      resolve = r;
    }),
  );
  await rerender({ id: "u-two" });
  expect(result.current).toBeNull();
  await act(async () => resolve([]));
  expect(result.current).toEqual([]);
  expect(mockRead).toHaveBeenCalledTimes(2);
});

test.each([
  ["activity", [null, start, 1, "u-n1"]],
  ["start", ["run", null, 1, "u-n2"]],
  ["time", ["run", start, null, "u-n3"]],
  ["uuid", ["run", start, 1, null]],
] as const)("nothing wanted when the %s is null: never read, null", async (_n, args) => {
  const { result } = await renderHook(() =>
    useRouteCandidates(...(args as Parameters<typeof useRouteCandidates>)),
  );
  await Promise.resolve();
  expect(mockRead).not.toHaveBeenCalled();
  expect(result.current).toBeNull();
});

test("a failed read is reported, answers no route, and is not remembered", async () => {
  mockRead.mockRejectedValueOnce(new Error("disk"));
  const first = await renderHook(() => useRouteCandidates("run", start, 1, "u-fail"));
  await waitFor(() => expect(first.result.current).toEqual([]));
  expect(mockReport).toHaveBeenCalledWith("routeGhost.candidates", expect.any(Error));

  const second = await renderHook(() => useRouteCandidates("run", start, 1, "u-fail"));
  await waitFor(() => expect(second.result.current).toEqual(shapes));
  expect(mockRead).toHaveBeenCalledTimes(2);
});
