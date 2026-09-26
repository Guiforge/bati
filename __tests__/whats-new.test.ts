import { hasUnseenNotes, markNotesSeen, releaseNotes } from "@/src/whatsNew";

// What the app embeds is exactly what app.config.js builds from the fastlane files, so the
// manifest here is that function's own output rather than a hand-written stand-in.
jest.mock("expo-constants", () => {
  const { extra } = require("../app.config.js")();
  return { __esModule: true, default: { expoConfig: { version: "2.0.0", extra } } };
});

// A real key-value store, as in update-check.test.ts: the behaviour is "asked once per version",
// and only a store that remembers can show it.
jest.mock("@/db/preferences", () => {
  const store: Record<string, string | undefined> = {};
  return {
    preferences: {
      store,
      getNotesSeenVersion: () => Promise.resolve(store.notesSeenVersion ?? null),
      setNotesSeenVersion: (version: string) => {
        store.notesSeenVersion = version;
        return Promise.resolve();
      },
    },
  };
});

const { preferences } = jest.requireMock("@/db/preferences") as {
  preferences: { store: Record<string, string | undefined> };
};

describe("hasUnseenNotes", () => {
  beforeEach(() => {
    for (const key of Object.keys(preferences.store)) delete preferences.store[key];
  });

  test("a fresh install says nothing, and remembers the version it met", async () => {
    expect(await hasUnseenNotes()).toBe(false);
    expect(preferences.store.notesSeenVersion).toBe("2.0.0");
  });

  test("an update offers the notes until they are seen, then never again for that version", async () => {
    preferences.store.notesSeenVersion = "1.9.0";
    expect(await hasUnseenNotes()).toBe(true);
    expect(await hasUnseenNotes()).toBe(true);

    await markNotesSeen();
    expect(await hasUnseenNotes()).toBe(false);
  });
});

describe("releaseNotes", () => {
  test("every shipped language has this version's notes, one line per entry", () => {
    for (const language of ["en", "fr", "de", "es"] as const) {
      const notes = releaseNotes(language);
      expect(notes.length).toBeGreaterThan(0);
      // The store files are hard-wrapped; a line starting lower-case is a wrap left unjoined.
      for (const line of notes) expect(line).not.toMatch(/^(-|[a-zäöüéèà])/);
    }
  });
});
