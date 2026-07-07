import { beforeEach, expect, test, vi } from "vitest";

import {
  LEGACY_ALBUM_STORAGE_KEY,
  parseGalleryItemsRaw,
  readGalleryItems,
  updateStoredGalleryItems,
} from "./galleryStorage";
import {
  getStoredArrayLength,
  removeLocalStorageKeys,
  updateStoredValue,
} from "./localStorageCache";
import {
  buildWeatherLoadingCities,
  isSameWeatherLocation,
  parseWeatherLocationsRaw,
  sanitizeWeatherLocation,
} from "./weatherStorage";

beforeEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

test("updateStoredValue persists through the parser and serializer contract", () => {
  const parseRaw = (raw) => (raw ? JSON.parse(raw) : []);
  const serialize = (items) => JSON.stringify(items);

  const nextItems = updateStoredValue({
    key: "mmgh-test-cache",
    parseRaw,
    serialize,
    updater: (items) => [...items, "first"],
    cacheLabel: "test cache",
  });

  expect(nextItems).toEqual(["first"]);
  expect(window.localStorage.getItem("mmgh-test-cache")).toBe("[\"first\"]");
});

test("removeLocalStorageKeys clears requested cache keys", () => {
  window.localStorage.setItem("kept", "1");
  window.localStorage.setItem(LEGACY_ALBUM_STORAGE_KEY, "[1]");

  removeLocalStorageKeys([LEGACY_ALBUM_STORAGE_KEY]);

  expect(window.localStorage.getItem(LEGACY_ALBUM_STORAGE_KEY)).toBeNull();
  expect(window.localStorage.getItem("kept")).toBe("1");
});

test("gallery storage ignores malformed records and reports legacy cache length", () => {
  const rawItems = JSON.stringify([
    { id: "image-1", name: "Sketch", src: "data:image/png;base64,abc" },
    { id: "missing-src", name: "Broken" },
    "invalid",
  ]);

  window.localStorage.setItem(LEGACY_ALBUM_STORAGE_KEY, JSON.stringify([1, 2, 3]));

  expect(parseGalleryItemsRaw(rawItems)).toEqual([
    { id: "image-1", name: "Sketch", src: "data:image/png;base64,abc" },
  ]);
  expect(getStoredArrayLength(LEGACY_ALBUM_STORAGE_KEY)).toBe(3);
});

test("gallery updater round-trips through localStorage", () => {
  const nextItems = updateStoredGalleryItems((items) => [
    ...items,
    { id: "image-1", name: "Sketch", src: "data:image/png;base64,abc" },
  ]);

  expect(nextItems).toHaveLength(1);
  expect(readGalleryItems()[0].id).toBe("image-1");
});

test("weather storage normalizes locations and preserves loading city state", () => {
  const location = sanitizeWeatherLocation({
    geoId: "1796236",
    name: "Shanghai",
    latitude: "31.2304",
    longitude: "121.4737",
    tone: "unknown",
  });

  expect(location).toMatchObject({
    geoId: 1796236,
    id: "geo-1796236",
    latitude: 31.2304,
    longitude: 121.4737,
    tone: "sunrise",
  });

  expect(parseWeatherLocationsRaw(JSON.stringify([location]))).toEqual([location]);
  expect(isSameWeatherLocation(location, { ...location, id: "other" })).toBe(true);

  const existingCity = { ...location, temperature: 24 };
  expect(buildWeatherLoadingCities([existingCity], [location])[0]).toBe(existingCity);
});
