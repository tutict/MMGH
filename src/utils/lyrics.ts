import { normalizeError } from "./appUtils";
import { updateStoredValue } from "./localStorageCache";

export const LYRICS_CACHE_STORAGE_KEY = "mmgh-lyrics-cache-v1";
export const LYRICS_CACHE_CLEAR_MARKER_STORAGE_KEY = "mmgh-lyrics-cache-cleared-at-v1";

type LyricsTrack = Record<string, any> & { id?: string | number };

type LyricsLookupEntry = {
  status?: string;
  error?: string;
};

type LyricsLookupState = Record<string, LyricsLookupEntry>;

type LyricsCacheEntry = Record<string, any> & {
  fingerprint?: string;
  source?: string;
};

type LyricsCache = Record<string, LyricsCacheEntry>;

export function readLyricsCache(): LyricsCache {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    return parseLyricsCacheRaw(window.localStorage.getItem(LYRICS_CACHE_STORAGE_KEY));
  } catch (error) {
    console.error("Failed to read lyrics cache", error);
    return {};
  }
}

export function readLyricsCacheClearMarker() {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    return String(window.localStorage.getItem(LYRICS_CACHE_CLEAR_MARKER_STORAGE_KEY) || "");
  } catch (error) {
    console.error("Failed to read lyrics cache clear marker", error);
    return "";
  }
}

export function writeLyricsCacheClearMarker(marker: unknown) {
  if (typeof window === "undefined") {
    return String(marker || "");
  }

  const normalizedMarker = String(marker || "");

  try {
    if (normalizedMarker) {
      window.localStorage.setItem(LYRICS_CACHE_CLEAR_MARKER_STORAGE_KEY, normalizedMarker);
    } else {
      window.localStorage.removeItem(LYRICS_CACHE_CLEAR_MARKER_STORAGE_KEY);
    }
    return normalizedMarker;
  } catch (error) {
    console.error("Failed to persist lyrics cache clear marker", error);
    throw new Error(`Failed to persist lyrics cache clear marker. ${normalizeError(error)}`);
  }
}

export function parseLyricsCacheRaw(raw: string | null | undefined): LyricsCache {
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    console.error("Failed to parse lyrics cache", error);
    return {};
  }
}

export function updateStoredLyricsCache(updater: (cache: LyricsCache) => LyricsCache) {
  return updateStoredValue({
    key: LYRICS_CACHE_STORAGE_KEY,
    parseRaw: parseLyricsCacheRaw,
    serialize: (cache) => JSON.stringify(cache || {}),
    updater,
    cacheLabel: "lyrics cache",
  });
}

export function buildLyricsLookupStateFromCache(
  cache: LyricsCache | null | undefined,
  trackList: LyricsTrack[] | null | undefined
): LyricsLookupState {
  return (Array.isArray(trackList) ? trackList : []).reduce((accumulator, track) => {
    if (!track?.id) {
      return accumulator;
    }

    const cacheKey = getLyricsCacheEntryKey(track);
    const entry = cache?.[cacheKey];

    if (entry?.fingerprint !== cacheKey || !entry?.source) {
      return accumulator;
    }

    accumulator[String(track.id)] = {
      status: entry.source === "manual" ? "manual" : "ready",
      error: "",
    };
    return accumulator;
  }, {} as LyricsLookupState);
}

export function buildLyricsLookupStateWithClearMarker(
  cache: LyricsCache | null | undefined,
  trackList: LyricsTrack[] | null | undefined
): LyricsLookupState {
  return (Array.isArray(trackList) ? trackList : []).reduce((accumulator, track) => {
    if (!track?.id) {
      return accumulator;
    }

    const cacheKey = getLyricsCacheEntryKey(track);
    const entry = cache?.[cacheKey];
    accumulator[String(track.id)] =
      entry?.fingerprint === cacheKey && entry?.source
        ? {
            status: entry.source === "manual" ? "manual" : "ready",
            error: "",
          }
        : {
            status: "cleared",
            error: "",
          };
    return accumulator;
  }, {} as LyricsLookupState);
}

export function mergeLyricsLookupStateFromCache({
  cache,
  previousState,
  trackList,
}: {
  cache?: LyricsCache | null;
  previousState?: LyricsLookupState | null;
  trackList?: LyricsTrack[] | null;
}): LyricsLookupState {
  const cacheState = buildLyricsLookupStateFromCache(cache, trackList);

  return Object.entries(previousState || {}).reduce((accumulator, [trackId, entry]) => {
    if (cacheState[trackId]) {
      return accumulator;
    }

    if (
      entry?.status === "loading" ||
      entry?.status === "cleared" ||
      String(entry?.error || "").trim()
    ) {
      accumulator[trackId] = entry;
    }
    return accumulator;
  }, { ...cacheState } as LyricsLookupState);
}

export function clearClearedLyricsLookupState(
  lookupState: LyricsLookupState | null | undefined
): LyricsLookupState {
  return Object.entries(lookupState || {}).reduce((accumulator, [trackId, entry]) => {
    if (entry?.status !== "cleared") {
      accumulator[trackId] = entry;
    }
    return accumulator;
  }, {} as LyricsLookupState);
}

export function getLyricsCacheEntryKey(track: LyricsTrack | null | undefined, duration?: number) {
  void duration;
  const title = resolveLyricsCacheIdentityPart(track, "title");
  const artist = resolveLyricsCacheIdentityPart(track, "artist");
  return `${title}__${artist}`;
}

export function resolveLyricsCacheIdentityPart(track: LyricsTrack | null | undefined, field: string) {
  const translationKeyField = `${field}Key`;
  return sanitizeLyricsSearchPart(track?.[translationKeyField] || track?.[field] || "");
}

export function sanitizeLyricsSearchPart(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}
export function resolveLyricsLines({ duration, entry, fallbackArtist, fallbackTitle, t }) {
  const syncedLines = parseLrcLyrics(entry?.syncedLyrics || "");
  if (syncedLines.length > 0) {
    return syncedLines;
  }

  const plainLines = parsePlainLyrics(entry?.plainLyrics || "");
  if (plainLines.length > 0) {
    return spreadPlainLyricsAcrossTrack(plainLines, duration);
  }

  return buildFallbackLyrics({ artist: fallbackArtist, duration, t, title: fallbackTitle });
}

export function parseLrcLyrics(text) {
  if (!text) {
    return [];
  }

  const lines = [];
  const pattern = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;

  String(text)
    .split(/\r?\n/)
    .forEach((rawLine) => {
      const timestamps = [...rawLine.matchAll(pattern)];
      const content = rawLine.replace(pattern, "").trim();
      if (timestamps.length === 0 || !content) {
        return;
      }

      timestamps.forEach((match) => {
        const minutes = Number(match[1] || 0);
        const seconds = Number(match[2] || 0);
        const fractionRaw = String(match[3] || "0");
        const fraction =
          fractionRaw.length === 3
            ? Number(fractionRaw) / 1000
            : fractionRaw.length === 2
              ? Number(fractionRaw) / 100
              : Number(fractionRaw) / 10;

        lines.push({
          time: minutes * 60 + seconds + fraction,
          text: content,
        });
      });
    });

  return lines.sort((left, right) => left.time - right.time);
}

export function parsePlainLyrics(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 80);
}

export function spreadPlainLyricsAcrossTrack(lines, duration) {
  const totalDuration = Math.max(duration || lines.length * 6, lines.length * 4, 24);
  const step = totalDuration / Math.max(lines.length, 1);

  return lines.map((line, index) => ({
    time: Math.round(step * index),
    text: line,
  }));
}

export function buildFallbackLyrics({ artist, duration, t, title }) {
  const totalDuration = Math.max(duration || 180, 120);
  const step = totalDuration / 6;
  return [
    { time: 0, text: title, subtext: artist },
    { time: Math.round(step), text: t("app.music.lyrics.status.loading"), subtext: t("app.music.playing") },
    { time: Math.round(step * 2), text: t("app.music.lyrics.fallback.line1"), subtext: t("app.music.lyrics.fallback.line2") },
    { time: Math.round(step * 3), text: t("app.music.panelDescription"), subtext: t("app.music.heroDescription") },
    { time: Math.round(step * 4), text: t("app.music.queueHint"), subtext: t("app.music.uploadHint") },
    { time: Math.round(step * 5), text: t("app.music.nowPlaying"), subtext: title },
  ];
}

export async function fetchLyricsFromLrclib({ artist, duration, title }) {
  const params = new URLSearchParams({
    artist_name: artist,
    track_name: title,
  });

  if (duration) {
    params.set("duration", String(Math.round(duration)));
  }

  const response = await fetch(`https://lrclib.net/api/get?${params.toString()}`, {
    headers: {
      Accept: "application/json",
    },
  });

  if (response.ok) {
    return extractLyricsPayload(await response.json());
  }

  if (response.status !== 404) {
    throw new Error(`lyrics-${response.status}`);
  }

  const searchParams = new URLSearchParams({
    artist_name: artist,
    track_name: title,
  });

  const searchResponse = await fetch(`https://lrclib.net/api/search?${searchParams.toString()}`, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!searchResponse.ok) {
    throw new Error(`lyrics-${searchResponse.status}`);
  }

  const payload = await searchResponse.json();
  if (!Array.isArray(payload)) {
    throw new Error("lyrics-invalid-payload");
  }

  const matchedLyrics = payload.find((item) => item && (item.syncedLyrics || item.plainLyrics));
  if (!matchedLyrics) {
    throw new Error("lyrics-404");
  }

  return extractLyricsPayload(matchedLyrics);
}

export function extractLyricsPayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("lyrics-invalid-payload");
  }

  return {
    plainLyrics: String(payload.plainLyrics || ""),
    syncedLyrics: String(payload.syncedLyrics || ""),
  };
}

export function normalizeLyricsError(error, t) {
  const message = String(error?.message || "");
  if (message === "lyrics-404") {
    return t("app.music.lyrics.status.notFound");
  }

  return t("app.music.lyrics.status.error");
}


