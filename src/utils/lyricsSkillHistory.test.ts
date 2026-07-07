import { expect, test } from "vitest";

import {
  buildLyricsLookupStateFromCache,
  buildLyricsLookupStateWithClearMarker,
  clearClearedLyricsLookupState,
  extractLyricsPayload,
  getLyricsCacheEntryKey,
  mergeLyricsLookupStateFromCache,
  normalizeLyricsError,
  parseLrcLyrics,
  parsePlainLyrics,
  resolveLyricsLines,
  spreadPlainLyricsAcrossTrack,
} from "./lyrics";
import {
  appendSkillHistoryEntry,
  buildSkillDraftFromVersion,
  getSkillHistoryEntries,
  parseImportedSkills,
  parseSkillHistoryRaw,
  removeSkillHistoryEntries,
  shouldTrackSkillVersion,
} from "./skillHistory";

function t(key) {
  return key;
}

test("lyrics parser prefers synced LRC and sorts timestamps", () => {
  expect(parseLrcLyrics("[00:10.50]Second\n[00:01.000]First")).toEqual([
    { time: 1, text: "First" },
    { time: 10.5, text: "Second" },
  ]);

  expect(
    resolveLyricsLines({
      duration: 60,
      entry: {
        syncedLyrics: "[00:02]Line",
        plainLyrics: "Plain fallback",
      },
      fallbackArtist: "Artist",
      fallbackTitle: "Title",
      t,
    })
  ).toEqual([{ time: 2, text: "Line" }]);
});

test("plain lyrics are trimmed and spread across the track", () => {
  const plainLines = parsePlainLyrics(" first \n\n second ");

  expect(plainLines).toEqual(["first", "second"]);
  expect(spreadPlainLyricsAcrossTrack(plainLines, 40)).toEqual([
    { time: 0, text: "first" },
    { time: 20, text: "second" },
  ]);
});

test("lyrics cache state maps ready, manual, cleared, and transient states", () => {
  const tracks = [
    { id: "one", title: "Track One", artist: "Artist" },
    { id: "two", title: "Track Two", artist: "Artist" },
  ];
  const cacheKey = getLyricsCacheEntryKey(tracks[0]);
  const cache = {
    [cacheKey]: {
      fingerprint: cacheKey,
      source: "manual",
    },
  };

  expect(buildLyricsLookupStateFromCache(cache, tracks)).toEqual({
    one: { status: "manual", error: "" },
  });
  expect(buildLyricsLookupStateWithClearMarker(cache, tracks)).toEqual({
    one: { status: "manual", error: "" },
    two: { status: "cleared", error: "" },
  });
  expect(
    mergeLyricsLookupStateFromCache({
      cache,
      previousState: {
        two: { status: "loading", error: "" },
        three: { status: "idle", error: "" },
      },
      trackList: tracks,
    })
  ).toEqual({
    one: { status: "manual", error: "" },
    two: { status: "loading", error: "" },
  });
  expect(
    clearClearedLyricsLookupState({
      one: { status: "cleared", error: "" },
      two: { status: "error", error: "failed" },
    })
  ).toEqual({
    two: { status: "error", error: "failed" },
  });
});

test("lyrics payload and error helpers normalize remote responses", () => {
  expect(extractLyricsPayload({ plainLyrics: "Plain", syncedLyrics: null })).toEqual({
    plainLyrics: "Plain",
    syncedLyrics: "",
  });
  expect(() => extractLyricsPayload(null)).toThrow("lyrics-invalid-payload");
  expect(normalizeLyricsError(new Error("lyrics-404"), t)).toBe(
    "app.music.lyrics.status.notFound"
  );
  expect(normalizeLyricsError(new Error("network"), t)).toBe("app.music.lyrics.status.error");
});

test("skill history parsing normalizes entries and removes invalid versions", () => {
  const parsed = parseSkillHistoryRaw(
    JSON.stringify({
      1: [
        {
          skillId: 1,
          name: "Helper",
          description: "Old",
          instructions: "Do it",
          triggerHint: "run",
          enabled: true,
          savedAt: 100,
          reason: "unknown",
        },
        { skillId: 0, savedAt: 100 },
      ],
      invalid: [{ skillId: 2, savedAt: 100 }],
    })
  );

  expect(parsed).toEqual({
    1: [
      {
        versionId: "skill-1-100",
        skillId: 1,
        name: "Helper",
        description: "Old",
        instructions: "Do it",
        triggerHint: "run",
        enabled: true,
        savedAt: 100,
        reason: "manual-save",
      },
    ],
  });
});

test("skill history helpers track changed payloads and remove entries", () => {
  const currentSkill = {
    id: 7,
    name: "Helper",
    description: "Old",
    instructions: "Do it",
    triggerHint: "run",
    enabled: true,
  };
  const nextSkill = { ...currentSkill, description: "New" };

  expect(shouldTrackSkillVersion(currentSkill, nextSkill)).toBe(true);
  expect(buildSkillDraftFromVersion({ ...currentSkill, skillId: 7 }, 7)).toEqual(currentSkill);

  const history = appendSkillHistoryEntry({}, currentSkill, "ai-rewrite");
  expect(getSkillHistoryEntries(history, 7)).toHaveLength(1);
  expect(getSkillHistoryEntries(history, 7)[0]).toMatchObject({
    skillId: 7,
    reason: "ai-rewrite",
  });
  expect(removeSkillHistoryEntries(history, 7)).toEqual({});
});

test("parseImportedSkills accepts single skills and bundles", () => {
  expect(
    parseImportedSkills(
      JSON.stringify({
        type: "mmgh-skill",
        skill: {
          name: "Imported",
          description: "Desc",
          instructions: "Do it",
          triggerHint: "import",
        },
      }),
      t
    )
  ).toEqual([
    {
      name: "Imported",
      description: "Desc",
      instructions: "Do it",
      triggerHint: "import",
      enabled: true,
    },
  ]);

  expect(
    parseImportedSkills(
      JSON.stringify({
        type: "mmgh-skill-bundle",
        skills: [{ name: "Disabled", enabled: false }],
      }),
      t
    )[0].enabled
  ).toBe(false);
  expect(() => parseImportedSkills("{bad", t)).toThrow("app.skills.import.invalidJson");
});
