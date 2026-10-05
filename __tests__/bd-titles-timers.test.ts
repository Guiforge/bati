import * as fs from "node:fs";
import * as path from "node:path";

const read = (p: string) => fs.readFileSync(path.resolve(__dirname, "..", p), "utf8");

/** The characters of JSX that set the element rendering `needle`. */
const before = (file: string, needle: string, span: number) => {
  const src = read(file);
  const at = src.indexOf(needle);
  expect(at).toBeGreaterThan(0);
  return src.slice(Math.max(0, at - span), at);
};

describe("every screen title is in the title font", () => {
  const titles: [string, string][] = [
    ["app/oath.tsx", 't("oath.screen_title")'],
    ["app/credits.tsx", 't("credits.title")'],
    ["app/xp.tsx", 't("xp.title")'],
    ["app/settings.tsx", 't("settings.title", "Settings")'],
    ["app/privacy.tsx", 't("privacy.title")'],
    ["app/safety.tsx", 't("safety.title")'],
    ["app/recap.tsx", 'recap.title ?? t("recap.title")'],
    ["app/exercises/index.tsx", 't("exercises.catalogue_title", "Exercises")'],
    ["app/exercises/new.tsx", '{editingId === null ? t("exercise_editor.title_new")'],
    ["app/exercises/[id].tsx", "          {title}\n"],
    ["app/(tabs)/quests/[id].tsx", 't("quests.details_title", "Quest")'],
    ["app/(tabs)/adventures/[id].tsx", 't("adventures.details_title")}\n'],
  ];
  it.each(titles)("%s", (file, needle) => {
    const head = before(file, needle, 600);
    expect(head.slice(head.lastIndexOf("<Text"))).toContain('fontFamily="$heading"');
  });

  it("the Journal's title (NTitle) is Alegreya, its body stays on $nocturne", () => {
    const src = read("components/journal/nocturne.tsx");
    expect(src).toMatch(/<TextFrame fontFamily="\$heading" fontWeight="700"/);
    expect(src).toContain('fontFamily: "$nocturne"');
  });
});

describe("one timer: body face, bold, tabular, $text", () => {
  const timers: [string, string][] = [
    ["components/session/WarmupView.tsx", "formatTime(Math.max(0, remainingSeconds))"],
    ["components/session/PrepView.tsx", "{running ? remainingSeconds"],
    ["components/session/RestView.tsx", "formatTime(remainingSeconds)"],
    ["components/session/ActiveExerciseView.tsx", "formatTime(remainingSeconds)"],
  ];
  it.each(timers)("%s", (file, needle) => {
    const head = before(file, needle, 600);
    const el = head.slice(head.lastIndexOf("<H1"));
    expect(el).toContain('fontFamily="$body"');
    expect(el).toContain('fontWeight="700"');
    expect(el).toContain('fontVariant={["tabular-nums"]}');
    expect(el).toContain('color="$text"');
  });
});

describe("no violet", () => {
  it("pastelPurple is gone from the palette and from every consumer", () => {
    expect(read("constants/rawColors.ts")).not.toContain("pastelPurple");
    for (const f of [
      "app/oath.tsx",
      "components/oath/OathFulfilledCard.tsx",
      "components/session/SessionRewards.tsx",
      "constants/exerciseColors.ts",
    ]) {
      expect(read(f)).not.toContain("pastelPurple");
    }
  });

  it("the info cards and the rest screen sit on ink and surface, not on a quest tint", () => {
    expect(read("app/(tabs)/quests/[id].tsx")).not.toContain("questTokens");
    expect(read("app/(tabs)/adventures/[id].tsx")).not.toContain("tokens?.bg");
    expect(read("app/(tabs)/adventures/index.tsx")).not.toContain("row.tokens");
    expect(read("components/session/RestView.tsx")).toContain('bg="$bgDark"');
  });
});
