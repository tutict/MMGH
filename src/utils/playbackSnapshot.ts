import { useSyncExternalStore } from "react";

export type PlaybackSnapshot = {
  currentTime: number;
  duration: number;
};

const EMPTY_PLAYBACK_SNAPSHOT: PlaybackSnapshot = Object.freeze({
  currentTime: 0,
  duration: 0,
});

let playbackSnapshot: PlaybackSnapshot = EMPTY_PLAYBACK_SNAPSHOT;
const listeners = new Set<() => void>();

function normalizeTimeValue(value: unknown) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return 0;
  }

  return Math.round(numericValue * 10) / 10;
}

function createPlaybackSnapshot(value: Partial<PlaybackSnapshot> | null | undefined): PlaybackSnapshot {
  return {
    currentTime: normalizeTimeValue(value?.currentTime),
    duration: normalizeTimeValue(value?.duration),
  };
}

function arePlaybackSnapshotsEqual(left: PlaybackSnapshot, right: PlaybackSnapshot) {
  return left.currentTime === right.currentTime && left.duration === right.duration;
}

function emitPlaybackSnapshot() {
  listeners.forEach((listener) => listener());
}

export function patchPlaybackSnapshot(partialSnapshot: Partial<PlaybackSnapshot> | null | undefined) {
  const nextSnapshot = createPlaybackSnapshot({
    ...playbackSnapshot,
    ...(partialSnapshot || {}),
  });

  if (arePlaybackSnapshotsEqual(playbackSnapshot, nextSnapshot)) {
    return playbackSnapshot;
  }

  playbackSnapshot = nextSnapshot;
  emitPlaybackSnapshot();
  return playbackSnapshot;
}

export function resetPlaybackSnapshot() {
  if (playbackSnapshot === EMPTY_PLAYBACK_SNAPSHOT) {
    return playbackSnapshot;
  }

  playbackSnapshot = EMPTY_PLAYBACK_SNAPSHOT;
  emitPlaybackSnapshot();
  return playbackSnapshot;
}

export function usePlaybackSnapshot() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => playbackSnapshot,
    () => EMPTY_PLAYBACK_SNAPSHOT
  );
}
