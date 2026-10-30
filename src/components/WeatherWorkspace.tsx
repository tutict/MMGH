import React, { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../i18n";
import { WEATHER_LOCATIONS, createInitialWeatherCity } from "./weatherData";
import { AppButton, AppStatusChip, AppTextField } from "./ui";

const OPEN_METEO_GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_RECENT_SEARCHES_STORAGE_KEY = "mmgh-weather-recent-searches-v1";
const WEATHER_USAGE_STORAGE_KEY = "mmgh-weather-usage-v1";
const MAX_RECENT_SEARCHES = 6;
const MAX_COMMON_CITY_SUGGESTIONS = 6;
const WEATHER_AUX_CACHE_WRITE_MAX_RETRIES = 5;

export async function searchWeatherLocations(query: unknown, lang: unknown, options: { signal?: AbortSignal } = {}) {
  const keyword = String(query || "").trim();
  if (!keyword) {
    return [];
  }

  const url = new URL(OPEN_METEO_GEOCODING_URL);
  url.searchParams.set("name", keyword);
  url.searchParams.set("count", "6");
  url.searchParams.set("language", String(lang || "en").toLowerCase().startsWith("zh") ? "zh" : "en");
  url.searchParams.set("format", "json");

  const response = await fetch(url.toString(), {
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error("City search request failed");
  }

  const payload = await response.json();
  const results = Array.isArray(payload?.results) ? payload.results : [];

  return results.map((result) => createWeatherLocationFromSearchResult(result));
}

function WeatherWorkspace({
  auxiliaryCacheVersion,
  clockNow,
  onLocalCacheError,
  selectedCityId,
  setSelectedCityId,
  weatherCities,
  weatherStatus,
  weatherError,
  weatherUpdatedAt,
  onRefresh,
  onAddCity,
  onRemoveCity,
}: Record<string, any>) {
  const { lang, t } = useI18n();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchStatus, setSearchStatus] = useState("idle");
  const [searchError, setSearchError] = useState("");
  const searchRequestIdRef = useRef(0);
  const [recentSearches, setRecentSearches] = useState(() => readRecentWeatherSearches());
  const [usageMap, setUsageMap] = useState(() => readWeatherUsageMap());

  const updateRecentSearches = React.useCallback((updater) => {
    try {
      const nextRecentSearches = updateStoredRecentWeatherSearches(updater);
      setRecentSearches(nextRecentSearches);
      return nextRecentSearches;
    } catch (error) {
      onLocalCacheError?.(t("app.settings.cache.writeFailed", { detail: normalizeError(error) }));
      return null;
    }
  }, [onLocalCacheError, t]);

  const updateUsageMap = React.useCallback((updater) => {
    try {
      const nextUsageMap = updateStoredWeatherUsageMap(updater);
      setUsageMap(nextUsageMap);
      return nextUsageMap;
    } catch (error) {
      onLocalCacheError?.(t("app.settings.cache.writeFailed", { detail: normalizeError(error) }));
      return null;
    }
  }, [onLocalCacheError, t]);

  const selectedCity = useMemo(
    () =>
      weatherCities.find((city) => city.id === selectedCityId) ||
      weatherCities[0] ||
      createInitialWeatherCity(WEATHER_LOCATIONS[0]),
    [selectedCityId, weatherCities]
  );
  useEffect(() => {
    const keyword = searchQuery.trim();
    const requestId = searchRequestIdRef.current + 1;
    searchRequestIdRef.current = requestId;

    if (!keyword) {
      setSearchResults([]);
      setSearchStatus("idle");
      setSearchError("");
      return undefined;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSearchStatus("loading");
      setSearchError("");
      void searchWeatherLocations(keyword, lang, {
        signal: controller.signal,
      })
        .then((results) => {
          if (searchRequestIdRef.current !== requestId) {
            return;
          }
          setSearchResults(results);
          setSearchStatus("ready");
        })
        .catch((error) => {
          if (error?.name === "AbortError") {
            return;
          }
          if (searchRequestIdRef.current !== requestId) {
            return;
          }
          setSearchResults([]);
          setSearchStatus("error");
          setSearchError(normalizeWeatherNetworkError(error, t));
        });
    }, 260);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [lang, searchQuery, t]);

  useEffect(() => {
    setRecentSearches(readRecentWeatherSearches());
    setUsageMap(readWeatherUsageMap());
  }, [auxiliaryCacheVersion]);

  const weatherCityIds = useMemo(() => new Set(weatherCities.map((city) => getCityIdentity(city))), [weatherCities]);
  const commonCities = useMemo(
    () => buildCommonCitySuggestions({ recentSearches, usageMap, weatherCities }),
    [recentSearches, usageMap, weatherCities]
  );

  const metricCards = [
    {
      label: t("app.weather.metric.feelsLike"),
      value: formatMetricValue(selectedCity.feelsLike, t("app.weather.unit.degree")),
      detail: t("app.weather.metric.precipitationValue", {
        value: selectedCity.precipitation ?? "--",
      }),
    },
    {
      label: t("app.weather.metric.humidity"),
      value: formatMetricValue(selectedCity.humidity, "%"),
      detail: selectedCity.airQualityKey
        ? t("app.weather.metric.airQualityValue", {
            value: t(selectedCity.airQualityKey),
          })
        : t("app.weather.metric.airQualityUnavailable"),
    },
    {
      label: t("app.weather.metric.wind"),
      value: formatMetricValue(selectedCity.wind, ` ${t("app.weather.unit.wind")}`),
      detail:
        selectedCity.visibility != null
          ? t("app.weather.metric.visibilityValue", {
              value: selectedCity.visibility,
            })
          : t("app.weather.metric.visibilityUnavailable"),
    },
    {
      label: t("app.weather.metric.sunCycle"),
      value: `${selectedCity.sunrise} / ${selectedCity.sunset}`,
      detail:
        selectedCity.high != null && selectedCity.low != null
          ? t("app.weather.metric.daylightRange", {
              high: selectedCity.high,
              low: selectedCity.low,
            })
          : t("app.weather.metric.daylightUnavailable"),
    },
  ];

  const searchSections = useMemo(() => {
    const sections = [];
    const keyword = searchQuery.trim().toLowerCase();

    if (searchQuery.trim()) {
      sections.push({
        key: "search-results",
        title: t("app.weather.search.section.results"),
        empty: searchError
          ? searchError
          : searchStatus === "loading"
            ? t("app.weather.search.loading")
            : t("app.weather.search.empty"),
        items: searchResults,
      });
    }

    const filteredRecent = recentSearches.filter((city) => matchesCityKeyword(city, keyword));
    const filteredCommon = commonCities.filter((city) => matchesCityKeyword(city, keyword));

    sections.push({
      key: "recent-searches",
      title: t("app.weather.search.section.recent"),
      empty: t("app.weather.search.recentEmpty"),
      items: filteredRecent,
    });
    sections.push({
      key: "common-cities",
      title: t("app.weather.search.section.common"),
      empty: t("app.weather.search.commonEmpty"),
      items: filteredCommon,
    });

    return sections;
  }, [commonCities, recentSearches, searchError, searchQuery, searchResults, searchStatus, t]);

  function rememberCityUsage(city: any, options: { includeRecent?: boolean } = {}) {
    const normalizedCity = sanitizeSearchSuggestion(city);
    if (!normalizedCity) {
      return;
    }
    const cityKey = getCityIdentity(normalizedCity);

    updateUsageMap((prev) => ({
      ...prev,
      [cityKey]: {
        count: (prev?.[cityKey]?.count || 0) + 1,
        city: normalizedCity,
      },
    }));

    if (options.includeRecent !== false) {
      updateRecentSearches((prev) => mergeRecentWeatherSearches(prev, normalizedCity));
    }
  }

  function handleSuggestionSelect(city) {
    const normalizedCity = sanitizeSearchSuggestion(city);
    if (!normalizedCity) {
      return;
    }
    const alreadyAdded = weatherCityIds.has(getCityIdentity(normalizedCity));

    rememberCityUsage(normalizedCity);

    if (!alreadyAdded) {
      onAddCity(normalizedCity);
    }

    setSelectedCityId(normalizedCity.id);
    setSearchQuery("");
    setSearchResults([]);
    setSearchStatus("idle");
    setSearchError("");
  }

  return (
    <section className="desk-weather" data-testid="weather-workspace">
      <header className="desk-weather__toolbar">
        <div className="desk-weather__status">
          <AppStatusChip tone={resolveWeatherStatusTone(weatherStatus)}>
            {t(`app.weather.status.${weatherStatus}`)}
          </AppStatusChip>
          <span className="section-note">
            {weatherUpdatedAt
              ? t("app.weather.updatedAt", {
                  date: formatTime(weatherUpdatedAt, lang),
                })
              : t("app.weather.updatedAtPending")}
          </span>
        </div>

        <AppButton
          className="ghost-button"
          onClick={onRefresh}
          disabled={weatherStatus === "loading"}
        >
          {weatherStatus === "loading" ? t("app.common.loading") : t("app.weather.refresh")}
        </AppButton>
      </header>

      {weatherError ? <div className="error-banner">{weatherError}</div> : null}

      <div className="desk-weather__layout">
        <div className="desk-weather__primary">
          <article className="weather-current">
            <div className="weather-current__head">
              <div>
                <h3>{getCityName(selectedCity, t)}</h3>
                <p className="section-note">
                  {getCityRegion(selectedCity, t)} ·{" "}
                  {formatCityTime(clockNow, selectedCity.timeZone, lang)}
                </p>
              </div>
              <span className="weather-current__condition">{t(selectedCity.conditionKey)}</span>
            </div>

            <div className="weather-current__readout">
              <strong>{selectedCity.temperature != null ? selectedCity.temperature : "--"}</strong>
              <span>{t("app.weather.unit.celsius")}</span>
            </div>

            <p className="weather-current__summary">
              {buildWeatherSummary({ city: selectedCity, t })}
            </p>

            <div className="weather-current__ranges">
              <span>
                {t("app.weather.metric.high")}{" "}
                {formatMetricValue(selectedCity.high, t("app.weather.unit.degree"))}
              </span>
              <span>
                {t("app.weather.metric.low")}{" "}
                {formatMetricValue(selectedCity.low, t("app.weather.unit.degree"))}
              </span>
              <span>
                {t("app.weather.metric.precipitation")} {selectedCity.precipitation ?? "--"}%
              </span>
            </div>
          </article>

          <section className="weather-metrics">
            {metricCards.map((card) => (
              <article key={card.label} className="weather-metric">
                <span>{card.label}</span>
                <strong>{card.value}</strong>
                <p>{card.detail}</p>
              </article>
            ))}
          </section>

          <section className="weather-forecast">
            <div className="section-head">
              <h3>{t("app.weather.hourly.title")}</h3>
              <span className="section-note">{t("app.weather.hourly.range")}</span>
            </div>

            {selectedCity.hourly.length > 0 ? (
              <div className="weather-hourly-row">
                {selectedCity.hourly.map((hour, index) => (
                  <article key={`${selectedCity.id}-${hour.time}`} className="weather-hourly">
                    <span>{formatHourlyLabel(hour, index, t)}</span>
                    <strong>{formatMetricValue(hour.temperature, t("app.weather.unit.degree"))}</strong>
                    <span className="weather-hourly__detail">{t(hour.conditionKey)}</span>
                    <span className="weather-hourly__detail">{hour.precipitation ?? "--"}%</span>
                  </article>
                ))}
              </div>
            ) : (
              <p className="desk-empty">{t("app.weather.emptyForecast")}</p>
            )}
          </section>

          <section className="weather-forecast">
            <div className="section-head">
              <h3>{t("app.weather.weekly.title")}</h3>
              <span className="section-note">{t("app.weather.weekly.range")}</span>
            </div>

            {selectedCity.daily.length > 0 ? (
              <div className="weather-week-list">
                {selectedCity.daily.map((day, index) => (
                  <div key={`${selectedCity.id}-${day.time}`} className="weather-week-row">
                    <strong>{formatDailyLabel(day, index, lang, t)}</strong>
                    <span>{t(day.conditionKey)}</span>
                    <span>{day.precipitation ?? "--"}%</span>
                    <span className="weather-week-row__range">
                      {formatMetricValue(day.high, t("app.weather.unit.degree"))} / {formatMetricValue(day.low, t("app.weather.unit.degree"))}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="desk-empty">{t("app.weather.emptyForecast")}</p>
            )}
          </section>

          <div className="weather-attribution">
            <span>{t("app.weather.attribution.label")}</span>
            <a href="https://open-meteo.com/en/docs" target="_blank" rel="noreferrer">
              Open-Meteo
            </a>
            <span>{t("app.weather.attribution.separator")}</span>
            <a href="https://open-meteo.com/en/docs/air-quality-api" target="_blank" rel="noreferrer">
              CAMS / Open-Meteo
            </a>
          </div>
        </div>

        <aside className="weather-cities">
          <div className="section-head">
            <h3>{t("app.weather.cityWidget.title")}</h3>
            <span className="section-note">
              {t("app.weather.cityWidget.count", { count: weatherCities.length })}
            </span>
          </div>

          <AppTextField
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t("app.weather.search.placeholder")}
            size="small"
            fullWidth
          />

          {searchQuery.trim() ? (
            <div className="weather-search-results">
              {searchSections.map((section) => {
                if (section.key !== "search-results" && section.items.length === 0) {
                  return null;
                }
                return (
                  <div key={section.key} className="weather-search-section">
                    <div className="weather-search-section__head">
                      <strong>{section.title}</strong>
                      <span>{section.items.length}</span>
                    </div>

                    {section.items.length > 0 ? (
                      section.items.map((result) => {
                        const alreadyAdded = weatherCityIds.has(getCityIdentity(result));
                        return (
                          <AppButton
                            key={`${section.key}-${result.id}`}
                            className="weather-search-row"
                            onClick={() => handleSuggestionSelect(result)}
                          >
                            <span className="weather-search-row__copy">
                              <strong>{getCityName(result, t)}</strong>
                              <span>{getCityRegion(result, t)}</span>
                            </span>
                            <span className="weather-search-row__action">
                              {alreadyAdded ? t("app.weather.search.open") : t("app.weather.search.add")}
                            </span>
                          </AppButton>
                        );
                      })
                    ) : (
                      <p className="weather-search-empty">{section.empty}</p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : null}

          <div className="weather-city-list">
            {weatherCities.map((city) => {
              const isActive = city.id === selectedCity.id;
              const canRemove = weatherCities.length > 1;
              return (
                <div key={city.id} className={`weather-city-row ${isActive ? "is-active" : ""}`}>
                  <AppButton
                    className="weather-city-row__select"
                    onClick={() => {
                      rememberCityUsage(city, { includeRecent: false });
                      setSelectedCityId(city.id);
                    }}
                  >
                    <span className="weather-city-row__copy">
                      <strong>{getCityName(city, t)}</strong>
                      <span>{getCityRegion(city, t)}</span>
                    </span>
                    <span className="weather-city-row__meta">
                      <strong>{formatMetricValue(city.temperature, t("app.weather.unit.degree"))}</strong>
                      <span>{formatCityTime(clockNow, city.timeZone, lang)}</span>
                    </span>
                  </AppButton>
                  <AppButton
                    className="weather-city-row__remove"
                    onClick={() => {
                      if (canRemove) {
                        onRemoveCity(city.id);
                      }
                    }}
                    disabled={!canRemove}
                    aria-label={t("app.weather.cityWidget.remove")}
                  >
                    {t("app.weather.cityWidget.remove")}
                  </AppButton>
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </section>
  );
}

function createWeatherLocationFromSearchResult(result) {
  const latitude = roundToFour(Number(result.latitude));
  const longitude = roundToFour(Number(result.longitude));

  return {
    id: buildWeatherLocationId(result),
    geoId: Number(result.id) || null,
    name: String(result.name || "Unknown"),
    region: [result.admin1, result.country].filter(Boolean).join(", ") || String(result.country || "Unknown"),
    timeZone: String(result.timezone || "UTC"),
    tone: pickWeatherTone(result),
    latitude,
    longitude,
  };
}

function buildWeatherLocationId(result) {
  if (result.id) {
    return `geo-${result.id}`;
  }
  return `geo-${roundToFour(Number(result.latitude))}-${roundToFour(Number(result.longitude))}`;
}

function pickWeatherTone(result) {
  const tones = ["sunrise", "rain", "aurora", "polar"];
  const seed = Math.abs(Number(result.id) || Math.round((Number(result.latitude) || 0) * 100));
  return tones[seed % tones.length];
}

function buildWeatherSummary({ city, t }) {
  if (
    city.temperature == null ||
    city.humidity == null ||
    city.wind == null ||
    city.precipitation == null
  ) {
    return t("app.weather.summary.pending");
  }

  return t("app.weather.summary.current", {
    condition: t(city.conditionKey),
    humidity: city.humidity,
    wind: city.wind,
    precipitation: city.precipitation,
  });
}

function getCityName(city, t) {
  return city.nameKey ? t(city.nameKey) : city.name || "--";
}

function getCityRegion(city, t) {
  return city.regionKey ? t(city.regionKey) : city.region || "--";
}

function getCityIdentity(city) {
  if (city.geoId) {
    return `geo-${city.geoId}`;
  }
  return `coord-${roundToFour(city.latitude)}-${roundToFour(city.longitude)}`;
}

function formatCityTime(clockNow, timeZone, lang) {
  return new Intl.DateTimeFormat(lang, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  }).format(new Date(clockNow));
}

function resolveWeatherStatusTone(status) {
  if (status === "idle") {
    return "idle";
  }
  if (status === "ready") {
    return "completed";
  }
  if (status === "partial") {
    return "warning";
  }
  if (status === "error") {
    return "failed";
  }
  return "running";
}

function formatMetricValue(value, suffix = "") {
  if (value == null || Number.isNaN(value)) {
    return `--${suffix}`;
  }
  return `${value}${suffix}`;
}

function normalizeNumber(value) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : null;
}

function roundToFour(value) {
  const normalized = normalizeNumber(value);
  return normalized == null ? null : Number(normalized.toFixed(4));
}

function formatApiClock(value) {
  if (!value) {
    return "--:--";
  }
  return String(value).slice(11, 16);
}

function formatHourlyLabel(hour, index, t) {
  if (index === 0) {
    return t("app.weather.hourly.now");
  }
  return formatApiClock(hour.time);
}

function formatDailyLabel(day, index, lang, t) {
  if (index === 0) {
    return t("app.weather.weekly.today");
  }

  const date = new Date(day.time);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return date.toLocaleDateString(lang, {
    weekday: "short",
  });
}

function formatTime(value, lang = "en-US") {
  if (!value) {
    return "--";
  }
  return new Date(value).toLocaleString(lang, {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function normalizeError(error) {
  if (!error) {
    return "Unknown error";
  }
  if (typeof error === "string") {
    return error;
  }
  if (error.message) {
    return error.message;
  }
  return "Unknown error";
}

function normalizeWeatherNetworkError(error, t) {
  const message = normalizeError(error);
  if (isNetworkFetchErrorMessage(message)) {
    return t("app.weather.error.network");
  }
  return message;
}

function isNetworkFetchErrorMessage(message) {
  return /networkerror|failed to fetch|load failed|fetch resource|network request failed/i.test(
    String(message || "")
  );
}

function buildCommonCitySuggestions({ recentSearches, usageMap, weatherCities }: Record<string, any>) {
  const rankedUsageEntries = Object.values((usageMap || {}) as Record<string, any>)
    .filter((entry) => entry?.city)
    .sort((left, right) => (right?.count || 0) - (left?.count || 0))
    .map((entry) => sanitizeSearchSuggestion(entry.city));

  const merged = [];
  const seen = new Set();

  [...rankedUsageEntries, ...weatherCities, ...recentSearches].forEach((city) => {
    if (!city) {
      return;
    }
    const normalizedCity = sanitizeSearchSuggestion(city);
    if (!normalizedCity) {
      return;
    }
    const key = getCityIdentity(normalizedCity);
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    merged.push(normalizedCity);
  });

  return merged.slice(0, MAX_COMMON_CITY_SUGGESTIONS);
}

function mergeRecentWeatherSearches(current, city) {
  const normalizedCity = sanitizeSearchSuggestion(city);
  const currentList = Array.isArray(current) ? current : [];
  if (!normalizedCity) {
    return currentList.slice(0, MAX_RECENT_SEARCHES);
  }
  const filtered = currentList.filter(
    (item) => getCityIdentity(item) !== getCityIdentity(normalizedCity)
  );
  return [normalizedCity, ...filtered].slice(0, MAX_RECENT_SEARCHES);
}

function sanitizeSearchSuggestion(city) {
  if (!city || typeof city !== "object") {
    return null;
  }

  const latitude = Number(city.latitude);
  const longitude = Number(city.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    id: String(city.id || `geo-${city.geoId || `${roundToFour(latitude)}-${roundToFour(longitude)}`}`),
    geoId: Number.isFinite(Number(city.geoId)) ? Number(city.geoId) : null,
    nameKey: city.nameKey ? String(city.nameKey) : undefined,
    regionKey: city.regionKey ? String(city.regionKey) : undefined,
    name: String(city.name || ""),
    region: String(city.region || ""),
    timeZone: String(city.timeZone || "UTC"),
    tone: ["sunrise", "rain", "aurora", "polar"].includes(city.tone) ? city.tone : "sunrise",
    latitude,
    longitude,
  };
}

function resolveCacheUpdater(current, updater) {
  return typeof updater === "function" ? updater(current) : updater;
}

function updateStoredWeatherAuxValue({ key, parseRaw, serialize, updater, cacheLabel }) {
  if (typeof window === "undefined") {
    return parseRaw(serialize(resolveCacheUpdater(parseRaw(null), updater)));
  }

  for (let attempt = 0; attempt < WEATHER_AUX_CACHE_WRITE_MAX_RETRIES; attempt += 1) {
    try {
      const raw = window.localStorage.getItem(key);
      const current = parseRaw(raw);
      const next = resolveCacheUpdater(current, updater);
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

function readRecentWeatherSearches() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    return parseRecentWeatherSearchesRaw(window.localStorage.getItem(WEATHER_RECENT_SEARCHES_STORAGE_KEY));
  } catch (error) {
    console.error("Failed to read recent weather searches", error);
    return [];
  }
}

function parseRecentWeatherSearchesRaw(raw) {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map((city) => sanitizeSearchSuggestion(city)).filter(Boolean);
  } catch (error) {
    console.error("Failed to parse recent weather searches", error);
    return [];
  }
}

function updateStoredRecentWeatherSearches(updater) {
  return updateStoredWeatherAuxValue({
    key: WEATHER_RECENT_SEARCHES_STORAGE_KEY,
    parseRaw: parseRecentWeatherSearchesRaw,
    serialize: (entries) =>
      JSON.stringify(
        (Array.isArray(entries) ? entries : [])
          .map((entry) => sanitizeSearchSuggestion(entry))
          .filter(Boolean)
      ),
    updater,
    cacheLabel: "recent weather searches",
  });
}

function readWeatherUsageMap() {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    return parseWeatherUsageMapRaw(window.localStorage.getItem(WEATHER_USAGE_STORAGE_KEY));
  } catch (error) {
    console.error("Failed to read weather usage map", error);
    return {};
  }
}

function parseWeatherUsageMapRaw(raw: string | null | undefined): Record<string, any> {
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    return Object.entries(parsed as Record<string, any>).reduce((accumulator, [key, value]) => {
      if (!value || typeof value !== "object") {
        return accumulator;
      }
      const city = sanitizeSearchSuggestion(value.city);
      if (!city) {
        return accumulator;
      }
      accumulator[key] = {
        count: Number.isFinite(Number(value.count)) ? Number(value.count) : 0,
        city,
      };
      return accumulator;
    }, {} as Record<string, any>);
  } catch (error) {
    console.error("Failed to parse weather usage map", error);
    return {};
  }
}

function updateStoredWeatherUsageMap(updater: (usageMap: Record<string, any>) => Record<string, any>) {
  return updateStoredWeatherAuxValue({
    key: WEATHER_USAGE_STORAGE_KEY,
    parseRaw: parseWeatherUsageMapRaw,
    serialize: (usageMap) =>
      JSON.stringify(
        Object.entries((usageMap || {}) as Record<string, any>).reduce((accumulator, [key, value]) => {
          const city = sanitizeSearchSuggestion(value?.city);
          if (!city) {
            return accumulator;
          }
          accumulator[key] = {
            count: Number.isFinite(Number(value?.count)) ? Number(value.count) : 0,
            city,
          };
          return accumulator;
        }, {} as Record<string, any>)
      ),
    updater,
    cacheLabel: "weather usage cache",
  });
}

function matchesCityKeyword(city, keyword) {
  if (!keyword) {
    return true;
  }

  return [city?.name, city?.region]
    .join(" ")
    .toLowerCase()
    .includes(keyword);
}

export default WeatherWorkspace;






