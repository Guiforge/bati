import fs from "node:fs";
import path from "node:path";

/**
 * W-04's promise about where it shows: in Settings > Devices and health data, and one line in a
 * session's detail. Nothing new on Home, in the session player, on the victory screen or in the
 * Journal list, which are the screens between the icon and the first rep and after the last.
 *
 * Every UI file that imports the export or reads one of its strings is on this list, and nothing
 * else may. A new one fails here until someone decides, in a PR, that it belongs.
 */
const ALLOWED = [
  // Starts the export in the background after a save and on app state changes; renders nothing.
  "app/_layout.tsx",
  "app/health-data.tsx",
  // The Settings row that leads there, rendered only where Health Connect is.
  "components/settings/HealthDataRow.tsx",
  "components/settings/HealthExportOptions.tsx",
  // The session detail, one tap from the Journal: the one line.
  "app/(tabs)/journal/[id].tsx",
  "components/journal/HealthExportLine.tsx",
];

const UI_DIRS = ["app", "components", "stores", "hooks"];
const TOUCHES_EXPORT =
  /src\/healthExport|modules\/bati-health|db\/healthExport|["'`]healthExport\.|HealthExport/;

function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return files(full);
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

test("only the settings screen, the session detail and the root layout know about the export", () => {
  const root = path.join(__dirname, "..");
  const touching = UI_DIRS.flatMap((dir) => files(path.join(root, dir)))
    .filter((file) => TOUCHES_EXPORT.test(fs.readFileSync(file, "utf8")))
    .map((file) => path.relative(root, file))
    .sort();
  expect(touching).toEqual([...ALLOWED].sort());
});

test("the screens around a session are not on the list", () => {
  for (const screen of [
    "app/(tabs)/index.tsx",
    "app/session.tsx",
    "components/session/VictoryView.tsx",
    "app/(tabs)/journal/index.tsx",
  ]) {
    expect(fs.existsSync(path.join(__dirname, "..", screen))).toBe(true);
    expect(ALLOWED).not.toContain(screen);
  }
});

test("the root layout only starts the export, it shows nothing", () => {
  const layout = fs.readFileSync(path.join(__dirname, "..", "app", "_layout.tsx"), "utf8");
  expect(layout).not.toMatch(/["'`]healthExport\./);
});
