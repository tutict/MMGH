import { normalizeError } from "./appUtils";

const LOCAL_CACHE_WRITE_MAX_RETRIES = 5;

export function removeLocalStorageKeys(keys) {
  if (typeof window === "undefined") {
    return;
  }

  const snapshots = [];
  keys.forEach((key) => {
    try {
      snapshots.push({
        key,
        value: window.localStorage.getItem(key),
      });
    } catch (error) {
      console.error(`Failed to inspect cache key: ${key}`, error);
      throw new Error(`Failed to clear local cache. ${key}: ${normalizeError(error)}`);
    }
  });

  const removedSnapshots = [];
  for (const snapshot of snapshots) {
    try {
      window.localStorage.removeItem(snapshot.key);
      removedSnapshots.push(snapshot);
    } catch (error) {
      console.error(`Failed to remove cache key: ${snapshot.key}`, error);
      const rollbackFailures = restoreLocalStorageSnapshots(removedSnapshots);
      const rollbackDetail =
        rollbackFailures.length > 0
          ? ` Rollback failed for ${rollbackFailures.join("; ")}.`
          : "";
      throw new Error(
        `Failed to clear local cache. ${snapshot.key}: ${normalizeError(error)}.${rollbackDetail}`
      );
    }
  }
}

export function restoreLocalStorageSnapshots(snapshots) {
  if (typeof window === "undefined") {
    return [];
  }

  return snapshots.reduce((failures, snapshot) => {
    try {
      if (snapshot.value === null) {
        window.localStorage.removeItem(snapshot.key);
      } else {
        window.localStorage.setItem(snapshot.key, snapshot.value);
      }
    } catch (error) {
      console.error(`Failed to restore cache key: ${snapshot.key}`, error);
      failures.push(`${snapshot.key}: ${normalizeError(error)}`);
    }
    return failures;
  }, []);
}

export function getStoredArrayLength(key) {
  if (typeof window === "undefined") {
    return 0;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return 0;
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch (error) {
    console.error(`Failed to inspect cache key: ${key}`, error);
    return 0;
  }
}

export function resolveStateUpdater(current, updater) {
  return typeof updater === "function" ? updater(current) : updater;
}

export function updateStoredValue({ key, parseRaw, serialize, updater, cacheLabel }) {
  if (typeof window === "undefined") {
    return parseRaw(serialize(resolveStateUpdater(parseRaw(null), updater)));
  }

  for (let attempt = 0; attempt < LOCAL_CACHE_WRITE_MAX_RETRIES; attempt += 1) {
    let raw = null;

    try {
      raw = window.localStorage.getItem(key);
      const current = parseRaw(raw);
      const next = resolveStateUpdater(current, updater);
      const serializedNext = serialize(next);
      const latestRaw = window.localStorage.getItem(key);

      if (latestRaw !== raw) {
        continue;
      }

      window.localStorage.setItem(key, serializedNext);

      if (window.localStorage.getItem(key) === serializedNext) {
        return parseRaw(serializedNext);
      }
    } catch (error) {
      console.error(`Failed to update ${cacheLabel}`, error);
      throw new Error(`Failed to persist ${cacheLabel}. ${normalizeError(error)}`);
    }
  }

  throw new Error(`Failed to persist ${cacheLabel}. Concurrent updates could not be reconciled.`);
}
