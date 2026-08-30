import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * A scrolling surface that also holds a text field must say `keyboardShouldPersistTaps`.
 *
 * With the keyboard up, a `ScrollView`'s default (`"never"`) swallows the first tap on any
 * control inside it to dismiss the keyboard — facebook/react-native#4087, open since 2015 and
 * working as documented. From where the hero stands it is simply a button that ignored them:
 * type a village name, tap Continue, nothing; tap again, it works. Four screens had it — the
 * oath, the quest editor, the exercise editor, and the catalogue whose whole job is "search,
 * then tap the result".
 *
 * A lint rule cannot see this: the input and the list are usually a hundred lines apart, and
 * the offending prop is the one that is *absent*. So it is a text scan, the same trade
 * `android-permissions.test.ts` and the scanignore test already make — and the same ratchet.
 * The fix is one prop; adding a file to EXEMPT instead needs a reason written next to it.
 *
 * It follows relative imports one level, because the first version of this scan did not and
 * missed Settings outright: the `ScrollView` is in `app/settings.tsx` and the `TextInput` is
 * three files away in `VillageNameRow`. One level is where it stops — a screen that reaches a
 * text field through two intermediaries is a screen worth reading by hand.
 *
 * "handled", not "always": a tap on empty space should still put the keyboard away.
 */

const ROOT = path.resolve(__dirname, "..");
const SEARCHED = ["app", "components"];

/** Anything that scrolls and can therefore steal the tap. LegendList is a ScrollView underneath. */
const SCROLLER = /<(RN)?ScrollView|<TamaguiScrollView|<LegendList|<FlatList/;
/** Anything that raises the keyboard. */
const TEXT_FIELD = /<TextInput|<Input\b/;

/**
 * Files that hold both but are not one tree. Each line is a claim someone has to defend.
 *
 * A sheet or a modal is its own surface: its text field is never inside the importer's scroll
 * view, and the sheet sets the prop on its own list.
 */
const EXEMPT: Record<string, string> = {
  "components/session/ActiveExerciseView.tsx":
    "the only text field it reaches is ExercisePickerSheet's search, which lives in a modal " +
    "sheet over this screen and persists taps itself.",
  "app/(tabs)/quests/[id].tsx":
    "same picker sheet, opened over the quest detail. Nothing on this screen is typed into.",
};

/** `@/components/x/Y` and `./Y` alike, resolved to a repo-relative .tsx path when one exists. */
function localImports(file: string, source: string): string[] {
  const resolved: string[] = [];
  for (const [, specifier] of source.matchAll(/from "(@\/[^"]+|\.[^"]+)"/g)) {
    // The group is always there when the pattern matched; noUncheckedIndexedAccess cannot know.
    assert(specifier);
    const target = specifier.startsWith("@/")
      ? path.join(ROOT, specifier.slice(2))
      : path.resolve(path.dirname(file), specifier);
    if (fs.existsSync(`${target}.tsx`)) resolved.push(`${target}.tsx`);
  }
  return resolved;
}

function sourceFiles(): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".tsx")) found.push(full);
    }
  };
  for (const dir of SEARCHED) walk(path.join(ROOT, dir));
  return found;
}

/** Whether this one file scrolls over a keyboard without saying what to do about it. */
function eatsTheFirstTap(file: string): boolean {
  if (path.relative(ROOT, file) in EXEMPT) return false;

  const source = fs.readFileSync(file, "utf8");
  if (!SCROLLER.test(source)) return false;
  if (source.includes("keyboardShouldPersistTaps")) return false;

  if (TEXT_FIELD.test(source)) return true;
  return localImports(file, source).some((imported) =>
    TEXT_FIELD.test(fs.readFileSync(imported, "utf8")),
  );
}

describe("a keyboard must not eat the first tap", () => {
  test("every scrolling surface with a text field in it persists taps", () => {
    const offenders = sourceFiles()
      .filter(eatsTheFirstTap)
      .map((file) => `  ${path.relative(ROOT, file)}`);

    if (offenders.length > 0) {
      throw new Error(
        'A scrolling view holds a text field and does not set keyboardShouldPersistTaps="handled".\n' +
          "With the keyboard up its first tap is spent dismissing it, which reads as a button that\n" +
          "did nothing (react-native#4087):\n" +
          offenders.join("\n"),
      );
    }
  });

  test("the scan can still find a file, so a green bar means something", () => {
    // The pattern above is the only thing keeping this test honest; a rename upstream that broke
    // it would leave the suite passing over zero files, forever.
    const searched = sourceFiles();
    expect(searched.length).toBeGreaterThan(50);
    // And the import walk still resolves something: Settings is the case it was written for.
    const settings = path.join(ROOT, "app", "settings.tsx");
    expect(
      localImports(settings, fs.readFileSync(settings, "utf8")).some((f) =>
        f.endsWith(path.join("settings", "VillageNameRow.tsx")),
      ),
    ).toBe(true);
    expect(searched.some((file) => file.endsWith(path.join("app", "exercises", "index.tsx")))).toBe(
      true,
    );
  });
});
