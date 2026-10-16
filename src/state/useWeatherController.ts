import { useCallback, useEffect, useRef, useState } from "react";
import {
  WEATHER_LOCATIONS,
  createInitialWeatherCities,
  fetchWeatherSnapshots,
} from "../components/weatherData";
import { normalizeError } from "../utils/appUtils";
import { removeLocalStorageKeys } from "../utils/localStorageCache";
import {
  WEATHER_LOCATIONS_STORAGE_KEY,
  WEATHER_RECENT_SEARCHES_STORAGE_KEY,
  WEATHER_USAGE_STORAGE_KEY,
  buildWeatherLoadingCities,
  isSameWeatherLocation,
  normalizeWeatherNetworkError,
  readWeatherLocations,
  sanitizeWeatherLocation,
  updateStoredWeatherLocations,
} from "../utils/weatherStorage";

export function useWeatherController({ currentView, openView, setError, t }) {
  const [weatherLocations, setWeatherLocations] = useState(() => readWeatherLocations());
  const [selectedWeatherCityId, setSelectedWeatherCityId] = useState(
    () => weatherLocations[0]?.id || WEATHER_LOCATIONS[0].id
  );
  const [weatherCities, setWeatherCities] = useState(() => createInitialWeatherCities(weatherLocations));
  const [weatherAuxCacheVersion, setWeatherAuxCacheVersion] = useState(0);
  const [weatherStatus, setWeatherStatus] = useState("idle");
  const [weatherError, setWeatherError] = useState("");
  const [weatherUpdatedAt, setWeatherUpdatedAt] = useState(0);
  const weatherRequestIdRef = useRef(0);
  const weatherAbortControllerRef = useRef<AbortController | null>(null);

  const updateWeatherLocations = useCallback((updater) => {
    try {
      const nextLocations = updateStoredWeatherLocations(updater);
      setWeatherLocations(nextLocations);
      return { ok: true, value: nextLocations };
    } catch (err) {
      setError(t("app.settings.cache.writeFailed", { detail: normalizeError(err) }));
      return { ok: false, value: null };
    }
  }, [setError, t]);

  const loadWeatherSnapshotData = useCallback(async (locations) => {
    const sourceLocations = Array.isArray(locations) && locations.length > 0 ? locations : weatherLocations;
    const requestId = weatherRequestIdRef.current + 1;
    const controller = new AbortController();
    weatherRequestIdRef.current = requestId;
    weatherAbortControllerRef.current?.abort();
    weatherAbortControllerRef.current = controller;
    setWeatherStatus("loading");
    setWeatherError("");
    setWeatherCities((currentCities) => buildWeatherLoadingCities(currentCities, sourceLocations));
    try {
      const nextCities = await fetchWeatherSnapshots(sourceLocations, { signal: controller.signal });
      if (weatherRequestIdRef.current !== requestId) {
        return;
      }
      setWeatherCities(nextCities);
      setWeatherUpdatedAt(Date.now());
      setWeatherStatus(nextCities.some((city) => city.fetchFailed) ? "partial" : "ready");
    } catch (err) {
      if (err?.name === "AbortError") {
        return;
      }
      if (weatherRequestIdRef.current !== requestId) {
        return;
      }
      setWeatherStatus("error");
      setWeatherError(normalizeWeatherNetworkError(err, t));
    } finally {
      if (weatherAbortControllerRef.current === controller) {
        weatherAbortControllerRef.current = null;
      }
    }
  }, [t, weatherLocations]);

  const syncWeatherCacheFromStorage = useCallback(() => {
    const nextLocations = readWeatherLocations();
    setWeatherLocations(nextLocations);
    setSelectedWeatherCityId((prev) =>
      nextLocations.some((location) => location.id === prev) ? prev : nextLocations[0]?.id || WEATHER_LOCATIONS[0].id
    );
  }, []);

  useEffect(() => {
    if (currentView !== "weather") {
      return undefined;
    }
    void loadWeatherSnapshotData(weatherLocations);
    return undefined;
  }, [currentView, loadWeatherSnapshotData, weatherLocations]);

  useEffect(() => {
    if (currentView === "weather") {
      return;
    }
    if (weatherAbortControllerRef.current) {
      weatherRequestIdRef.current += 1;
      weatherAbortControllerRef.current.abort();
      weatherAbortControllerRef.current = null;
      setWeatherStatus((status) => (status === "loading" ? (weatherUpdatedAt ? "ready" : "idle") : status));
    }
  }, [currentView, weatherUpdatedAt]);

  useEffect(
    () => () => {
      weatherRequestIdRef.current += 1;
      weatherAbortControllerRef.current?.abort();
      weatherAbortControllerRef.current = null;
    },
    []
  );

  const handleAddWeatherCity = useCallback((location) => {
    const normalizedLocation = sanitizeWeatherLocation(location);
    if (!normalizedLocation) {
      return;
    }
    const weatherLocationUpdate = updateWeatherLocations((prev) => {
      if (prev.some((item) => isSameWeatherLocation(item, normalizedLocation))) {
        return prev;
      }
      return [...prev, normalizedLocation];
    });
    if (!weatherLocationUpdate.ok) {
      return;
    }
    setSelectedWeatherCityId(normalizedLocation.id);
    openView("weather");
  }, [openView, updateWeatherLocations]);

  const handleRemoveWeatherCity = useCallback((cityId) => {
    if (!cityId) {
      return;
    }
    const weatherLocationUpdate = updateWeatherLocations((prev) => {
      if (prev.length <= 1) {
        return prev;
      }
      const nextLocations = prev.filter((city) => city.id !== cityId);
      if (nextLocations.length === 0) {
        return prev;
      }
      return nextLocations;
    });
    if (!weatherLocationUpdate.ok) {
      return;
    }
    if (!weatherLocationUpdate.value.some((city) => city.id === selectedWeatherCityId)) {
      setSelectedWeatherCityId(weatherLocationUpdate.value[0]?.id || WEATHER_LOCATIONS[0].id);
    }
  }, [selectedWeatherCityId, updateWeatherLocations]);

  const handleClearWeatherCache = useCallback(() => {
    if (typeof window !== "undefined" && !window.confirm(t("app.settings.cache.confirm.weather"))) {
      return;
    }
    const fallbackLocations = WEATHER_LOCATIONS.map((location) => sanitizeWeatherLocation(location)).filter(Boolean);
    setError("");
    try {
      removeLocalStorageKeys([
        WEATHER_LOCATIONS_STORAGE_KEY,
        WEATHER_RECENT_SEARCHES_STORAGE_KEY,
        WEATHER_USAGE_STORAGE_KEY,
      ]);
      setWeatherLocations(fallbackLocations);
      setSelectedWeatherCityId(fallbackLocations[0]?.id || WEATHER_LOCATIONS[0].id);
      setWeatherCities(createInitialWeatherCities(fallbackLocations));
      setWeatherStatus("loading");
      setWeatherError("");
      setWeatherUpdatedAt(0);
      setWeatherAuxCacheVersion((prev) => prev + 1);
    } catch (err) {
      setError(t("app.settings.cache.clearFailed", { detail: normalizeError(err) }));
    }
  }, [setError, t]);

  const resetWeatherAfterClearAll = useCallback((fallbackLocations) => {
    setWeatherLocations(fallbackLocations);
    setSelectedWeatherCityId(fallbackLocations[0]?.id || WEATHER_LOCATIONS[0].id);
    setWeatherCities(createInitialWeatherCities(fallbackLocations));
    setWeatherStatus("loading");
    setWeatherError("");
    setWeatherUpdatedAt(0);
    setWeatherAuxCacheVersion((prev) => prev + 1);
  }, []);

  return {
    handleAddWeatherCity,
    handleClearWeatherCache,
    handleRemoveWeatherCity,
    loadWeatherSnapshotData,
    resetWeatherAfterClearAll,
    selectedWeatherCityId,
    setSelectedWeatherCityId,
    setWeatherAuxCacheVersion,
    syncWeatherCacheFromStorage,
    weatherAuxCacheVersion,
    weatherCities,
    weatherError,
    weatherLocations,
    weatherStatus,
    weatherUpdatedAt,
  };
}
