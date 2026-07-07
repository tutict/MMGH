import { WEATHER_LOCATIONS, createInitialWeatherCity } from "../components/weatherData";
import { normalizeError } from "./appUtils";
import { updateStoredValue } from "./localStorageCache";

export const WEATHER_LOCATIONS_STORAGE_KEY = "mmgh-weather-locations-v1";
export const WEATHER_RECENT_SEARCHES_STORAGE_KEY = "mmgh-weather-recent-searches-v1";
export const WEATHER_USAGE_STORAGE_KEY = "mmgh-weather-usage-v1";

export function readWeatherLocations() {
  if (typeof window === "undefined") {
    return WEATHER_LOCATIONS;
  }

  try {
    return parseWeatherLocationsRaw(window.localStorage.getItem(WEATHER_LOCATIONS_STORAGE_KEY));
  } catch (error) {
    console.error("Failed to read weather locations", error);
    return WEATHER_LOCATIONS;
  }
}

export function parseWeatherLocationsRaw(raw) {
  if (!raw) {
    return WEATHER_LOCATIONS;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return WEATHER_LOCATIONS;
    }

    const locations = parsed.map((item) => sanitizeWeatherLocation(item)).filter(Boolean);
    return locations.length > 0 ? locations : WEATHER_LOCATIONS;
  } catch (error) {
    console.error("Failed to parse weather locations", error);
    return WEATHER_LOCATIONS;
  }
}

export function updateStoredWeatherLocations(updater) {
  return updateStoredValue({
    key: WEATHER_LOCATIONS_STORAGE_KEY,
    parseRaw: parseWeatherLocationsRaw,
    serialize: (locations) => {
      const normalizedLocations = (Array.isArray(locations) ? locations : [])
        .map((location) => sanitizeWeatherLocation(location))
        .filter(Boolean);
      return JSON.stringify(normalizedLocations.length > 0 ? normalizedLocations : WEATHER_LOCATIONS);
    },
    updater,
    cacheLabel: "weather cache",
  });
}

export function sanitizeWeatherLocation(location) {
  if (!location || typeof location !== "object") {
    return null;
  }

  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const fallbackId =
    location.id ||
    `geo-${Number(location.geoId) || `${latitude.toFixed(4)}-${longitude.toFixed(4)}`}`;

  return {
    id: String(fallbackId),
    geoId: Number.isFinite(Number(location.geoId)) ? Number(location.geoId) : null,
    nameKey: location.nameKey ? String(location.nameKey) : undefined,
    regionKey: location.regionKey ? String(location.regionKey) : undefined,
    name: String(location.name || ""),
    region: String(location.region || ""),
    timeZone: String(location.timeZone || "UTC"),
    tone: ["sunrise", "rain", "aurora", "polar"].includes(location.tone) ? location.tone : "sunrise",
    latitude,
    longitude,
  };
}

export function isSameWeatherLocation(left, right) {
  if (!left || !right) {
    return false;
  }

  if (left.geoId && right.geoId) {
    return Number(left.geoId) === Number(right.geoId);
  }

  return (
    Number(left.latitude).toFixed(4) === Number(right.latitude).toFixed(4) &&
    Number(left.longitude).toFixed(4) === Number(right.longitude).toFixed(4)
  );
}

export function normalizeWeatherNetworkError(error, t) {
  const message = normalizeError(error);
  if (/networkerror|failed to fetch|load failed|fetch resource|network request failed/i.test(message)) {
    return t("app.weather.error.network");
  }
  return message;
}

export function buildWeatherLoadingCities(currentCities, sourceLocations) {
  const currentById = new Map(
    (Array.isArray(currentCities) ? currentCities : [])
      .filter((city) => city?.id)
      .map((city) => [city.id, city])
  );

  return (Array.isArray(sourceLocations) ? sourceLocations : WEATHER_LOCATIONS).map(
    (location) => currentById.get(location.id) || createInitialWeatherCity(location)
  );
}
