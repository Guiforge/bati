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
 * (Empty today. It is meant to stay that way: a screen where the field and the list really are
 * separate surfaces is rare enough to be worth explaining here.)
 */
const EXEMPT: Record<string, string> = {};

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

describe("a keyboard must not eat the first tap", () => {
  test("every scrolling surface with a text field in it persists taps", () => {
    const offenders: string[] = [];

    for (const file of sourceFiles()) {
      const relative = path.relative(ROOT, file);
      if (relative in EXEMPT) continue;

      const source = fs.readFileSync(file, "utf8");
      if (!(SCROLLER.test(source) && TEXT_FIELD.test(source))) continue;
      if (source.includes("keyboardShouldPersistTaps")) continue;

      offenders.push(`  ${relative}`);
    }

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
    expect(searched.some((file) => file.endsWith(path.join("app", "exercises", "index.tsx")))).toBe(
      true,
    );
  });
});
