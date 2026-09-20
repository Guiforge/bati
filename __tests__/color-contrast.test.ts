import * as fs from "node:fs";
import * as path from "node:path";
import config from "@/tamagui.config";

/**
 * What a colour token is allowed to be written on, in contrast ratios.
 *
 * This is a ratchet, and the thing it caught is worth stating: the "most XP" record drew its star
 * in `$pastelYellow`, which is not a pale yellow but #33301A, a legacy safety-net tone. 1.39:1 on
 * `$surface`. The star was invisible, it had been for as long as the badge existed, and nothing
 * could see it: the token exists, the prop is spelled right, the component renders, the test
 * suite is green and the screenshot shows a card with an icon-shaped hole nobody reads as wrong.
 * The adventures screen had the same shape of bug, a `$bgDark` sword on a `$primary` chip at
 * 2.71:1, sitting next to that chip's own label at 7.06:1.
 *
 * **Resolved through the theme, not through the token map**, because that is what the app does:
 * `color="$muted"` renders #909ACB, since `tamagui.config.ts` deliberately overrides `muted` with
 * `textSecondary` and leaves `rawColors.muted` (#64748B) to the three consumers that cannot take
 * a token at all. Reading the palette file instead would fail this pair and pass the star, which
 * is exactly backwards.
 */

type ThemeValues = Record<string, { val: string } | string>;

const theme = config.themes.dark as unknown as ThemeValues;

const value = (token: string): string => {
  const raw = theme[token];
  const hex = typeof raw === "string" ? raw : raw?.val;
  if (!hex) throw new Error(`$${token} is not a key of the dark theme`);
  return hex;
};

/**
 * Everything text or a meaningful icon is drawn on. Fills are not here: `$primary`, `$error`,
 * `$resourceGold` and the one-off `$pastelYellow` celebration card carry a label of their own
 * choosing, picked by hand against that fill — `NewRecordsBadge` writes the working out in a
 * comment. A fill in this list would fail those deliberate pairings.
 *
 * `ink800`/`ink900` are missing on purpose. They belong to the Journal's `dark_journal` sub-theme,
 * which remaps `primary`, `success` and `error` to its gold ramp before anything is drawn on
 * them, so pairing them with this theme's values would assert combinations that cannot happen.
 */
const SURFACES = [
  "bgDark",
  "surface",
  "surface2",
  "bgOverlay",
  "bgOverlaySoft",
  "glassBg",
  "bgLight",
  "bossPhase2",
  "bossPhase3",
  "bossPhase4",
] as const;

/** WCAG AA for body text. Anything in here may be a sentence. */
const TEXT_TOKENS = [
  "text",
  "textSecondary",
  "muted",
  "primaryText",
  "resourceGold",
  "gold100",
  "gold300",
  "success",
  "warning",
  "white",
] as const;

/**
 * WCAG AA for a meaningful icon, and for large text. These are accents: short bold labels and
 * glyphs, never a paragraph. `$secondary` at 3.75:1 is the reason this tier exists rather than
 * one floor for everything.
 */
const ACCENT_TOKENS = ["secondary", "error", "danger"] as const;

const AA_TEXT = 4.5;
const AA_ICON = 3;

function channels(color: string): [number, number, number, number] {
  if (color.startsWith("#")) {
    const hex = color.slice(1);
    const full =
      hex.length === 3
        ? hex
            .split("")
            .map((c) => c + c)
            .join("")
        : hex;
    return [
      Number.parseInt(full.slice(0, 2), 16),
      Number.parseInt(full.slice(2, 4), 16),
      Number.parseInt(full.slice(4, 6), 16),
      1,
    ];
  }
  const parts = (color.match(/[\d.]+/g) ?? []).map(Number);
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0, parts[3] ?? 1];
}

/**
 * A translucent surface shows the void behind it, so it is composited over `bgDark` before being
 * measured. `$glassBg` and `$bgOverlay` are both rgba, and reading them as opaque would credit
 * them with a contrast they do not have.
 */
function flatten(color: string): [number, number, number] {
  const [r, g, b, a] = channels(color);
  const [vr, vg, vb] = channels(value("bgDark"));
  return [r * a + vr * (1 - a), g * a + vg * (1 - a), b * a + vb * (1 - a)];
}

function luminance(color: string): number {
  const linear = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = flatten(color);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

function contrast(foreground: string, background: string): number {
  const a = luminance(foreground);
  const b = luminance(background);
  const [lighter, darker] = a > b ? [a, b] : [b, a];
  return (lighter + 0.05) / (darker + 0.05);
}

describe("colour contrast", () => {
  describe.each(SURFACES)("on $0", (surface) => {
    it.each(TEXT_TOKENS)(`$%s clears AA for body text`, (token) => {
      expect(contrast(value(token), value(surface))).toBeGreaterThanOrEqual(AA_TEXT);
    });

    it.each(ACCENT_TOKENS)(`$%s clears AA for a meaningful icon`, (token) => {
      expect(contrast(value(token), value(surface))).toBeGreaterThanOrEqual(AA_ICON);
    });
  });

  /**
   * The clause that makes the two lists above a ratchet rather than a snapshot: reaching for a
   * token nobody has weighed fails here, which is the only thing that would have stopped
   * `$pastelYellow`. Adding a token to a list is a decision with a floor attached; adding it to a
   * component is not.
   *
   * ponytail: text scan, the trade `android-permissions.test.ts` and `session-art.test.ts` both
   * make. It sees `color="$x"` and misses a colour computed in a ternary or handed down a prop.
   * A rendered assertion would need the layout pass jest does not run.
   */
  it("every token written as a colour has a floor", () => {
    const roots = ["app", "components", "src"].map((d) => path.resolve(__dirname, "..", d));
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.tsx?$/.test(entry.name)) files.push(full);
      }
    };
    for (const root of roots) walk(root);

    const declared = new Set<string>([...TEXT_TOKENS, ...ACCENT_TOKENS]);
    const undeclared = new Map<string, string>();
    for (const file of files) {
      const source = fs.readFileSync(file, "utf8");
      // `\bcolor=` and not `Color=`: `borderColor`, `backgroundColor` and `tintColor` all paint
      // something that is not a glyph, and hold to different floors.
      for (const match of source.matchAll(/\bcolor="\$([a-zA-Z0-9]+)"/g)) {
        const token = match[1];
        if (token === undefined || declared.has(token)) continue;
        undeclared.set(token, path.relative(process.cwd(), file));
      }
    }

    expect([...undeclared].map(([token, file]) => `$${token} in ${file}`)).toEqual([]);
  });
});
