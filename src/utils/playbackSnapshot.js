import { useSyncExternalStore } from "react";

const EMPTY_PLAYBACK_SNAPSHOT = Object.freeze({
  currentTime: 0,
  duration: 0,
});

let playbackSnapshot = EMPTY_PLAYBACK_SNAPSHOT;
const listeners = new Set();

function normalizeTimeValue(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return 0;
  }

  return Math.round(numericValue * 10) / 10;
}

function createPlaybackSnapshot(value) {
  return {
    currentTime: normalizeTimeValue(value?.currentTime),
    duration: normalizeTimeValue(value?.duration),
  };
}

function arePlaybackSnapshotsEqual(left, right) {
  return left.currentTime === right.currentTime && left.duration === right.duration;
}

function emitPlaybackSnapshot() {
  listeners.forEach((listener) => listener());
}

export function patchPlaybackSnapshot(partialSnapshot) {
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
