import assert from "node:assert/strict";

import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";

import { FilterRail, type RailGroup } from "@/components/common/FilterRail";
import "@/i18n";
import config from "@/tamagui.config";

// The rail's contract is about what is on screen at each step — the pills never reflow, line
// two shows one thing at a time — so every case asserts presence/absence in the tree.
// RNTL 14: `render` is async, so every case awaits it before touching `screen`.

const noop = () => {};

function chip(g: RailGroup[], groupIndex: number, chipIndex: number) {
  const found = g[groupIndex]?.chips[chipIndex];
  assert(found, `no chip at ${groupIndex}/${chipIndex}`);
  return found;
}

function groups(over: { durationActive?: string; muscles?: string[] } = {}): RailGroup[] {
  const active = new Set(over.muscles ?? []);
  return [
    {
      key: "duration",
      label: "Duration",
      single: true,
      chips: ["short", "long"].map((k) => ({
        key: k,
        label: k,
        active: over.durationActive === k,
        onPress: noop,
      })),
    },
    {
      key: "muscle",
      label: "Muscles",
      chips: ["Back", "Chest", "Arms"].map((m) => ({
        key: m,
        label: m,
        active: active.has(m),
        onPress: noop,
      })),
    },
    {
      key: "ladder",
      label: "Ladder",
      chips: [{ key: "ladder-only", label: "On a ladder", active: false, onPress: noop }],
    },
  ];
}

const renderRail = (g: RailGroup[], onClearAll = noop) =>
  render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <FilterRail groups={g} onClearAll={onClearAll} />
    </TamaguiProvider>,
  );

const press = (label: string) => act(async () => fireEvent.press(screen.getByText(label)));

describe("FilterRail", () => {
  it("shows one pill per dimension, a toggle for a one-chip group, and no second line", async () => {
    await renderRail(groups());

    expect(screen.getByText("Duration")).toBeTruthy();
    expect(screen.getByText("Muscles")).toBeTruthy();
    expect(screen.getByText("On a ladder")).toBeTruthy();
    // Nothing open, nothing applied: the options stay hidden.
    expect(screen.queryByText("Back")).toBeNull();
    expect(screen.queryByText("short")).toBeNull();
  });

  it("opens one dimension at a time and folds it on a second tap", async () => {
    await renderRail(groups());

    await press("Muscles");
    expect(screen.getByText("Back")).toBeTruthy();
    expect(screen.queryByText("short")).toBeNull();

    await press("Duration");
    expect(screen.getByText("short")).toBeTruthy();
    expect(screen.queryByText("Back")).toBeNull();

    await press("Duration");
    expect(screen.queryByText("short")).toBeNull();
  });

  it("forwards a chip tap and folds a single-select group, not a multi-select one", async () => {
    const g = groups();
    const onShort = jest.fn();
    const onBack = jest.fn();
    chip(g, 0, 0).onPress = onShort;
    chip(g, 1, 0).onPress = onBack;
    await renderRail(g);

    await press("Duration");
    await press("short");
    expect(onShort).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("long")).toBeNull();

    await press("Muscles");
    await press("Back");
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Chest")).toBeTruthy();
  });

  // The pill label is the reflow guard: "Muscles" must not become "Muscles · 2".
  it("summarises applied filters on line two without renaming the pills", async () => {
    await renderRail(groups({ durationActive: "short", muscles: ["Back", "Arms"] }));

    expect(screen.getByText("Muscles")).toBeTruthy();
    expect(screen.queryByText(/Muscles ·/)).toBeNull();

    expect(screen.getByLabelText("Remove Back")).toBeTruthy();
    expect(screen.getByLabelText("Remove Arms")).toBeTruthy();
    expect(screen.getByLabelText("Remove short")).toBeTruthy();
    expect(screen.queryByLabelText("Remove Chest")).toBeNull();
    expect(screen.getByText("Clear")).toBeTruthy();
  });

  it("removes one filter from the summary and clears them all from the trailing chip", async () => {
    const g = groups({ muscles: ["Back"] });
    const onBack = jest.fn();
    const onClearAll = jest.fn();
    chip(g, 1, 0).onPress = onBack;
    await renderRail(g, onClearAll);

    await act(async () => fireEvent.press(screen.getByLabelText("Remove Back")));
    expect(onBack).toHaveBeenCalledTimes(1);

    await press("Clear");
    expect(onClearAll).toHaveBeenCalledTimes(1);
  });

  it("shows the open options instead of the summary while a dimension is open", async () => {
    await renderRail(groups({ muscles: ["Back"] }));
    expect(screen.getByLabelText("Remove Back")).toBeTruthy();

    await press("Duration");
    expect(screen.queryByLabelText("Remove Back")).toBeNull();
    expect(screen.getByText("short")).toBeTruthy();
  });

  it("renders nothing for an empty group list", async () => {
    await renderRail([]);
    expect(screen.queryByText("Clear")).toBeNull();
  });
});
