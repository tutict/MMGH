import React, { useEffect, useMemo, useState } from "react";
import { useI18n } from "../i18n";

const OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const OPEN_METEO_AIR_QUALITY_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";
const OPEN_METEO_GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_RECENT_SEARCHES_STORAGE_KEY = "mmgh-weather-recent-searches-v1";
const WEATHER_USAGE_STORAGE_KEY = "mmgh-weather-usage-v1";
const MAX_RECENT_SEARCHES = 6;
const MAX_COMMON_CITY_SUGGESTIONS = 6;

export const WEATHER_LOCATIONS = [
  {
    id: "shanghai",
    geoId: 1796236,
    nameKey: "app.weather.city.shanghai.name",
    regionKey: "app.weather.city.shanghai.region",
    name: "Shanghai",
    region: "China",
    timeZone: "Asia/Shanghai",
    tone: "sunrise",
    latitude: 31.2304,
    longitude: 121.4737,
  },
  {
    id: "tokyo",
    geoId: 1850144,
    nameKey: "app.weather.city.tokyo.name",
    regionKey: "app.weather.city.tokyo.region",
    name: "Tokyo",
    region: "Japan",
    timeZone: "Asia/Tokyo",
    tone: "rain",
    latitude: 35.6762,
    longitude: 139.6503,
  },
  {
    id: "singapore",
    geoId: 1880252,
    nameKey: "app.weather.city.singapore.name",
    regionKey: "app.weather.city.singapore.region",
    name: "Singapore",
    region: "Singapore",
    timeZone: "Asia/Singapore",
    tone: "aurora",
    latitude: 1.3521,
    longitude: 103.8198,
  },
  {
    id: "reykjavik",
    geoId: 3413829,
    nameKey: "app.weather.city.reykjavik.name",
    regionKey: "app.weather.city.reykjavik.region",
    name: "Reykjavik",
    region: "Iceland",
    timeZone: "Atlantic/Reykjavik",
    tone: "polar",
    latitude: 64.1466,
    longitude: -21.9426,
  },
];

export function createInitialWeatherCities(locations = WEATHER_LOCATIONS) {
  return locations.map((location) => createInitialWeatherCity(location));
}

export async function fetchWeatherSnapshots(locations, options = {}) {
  const sourceLocations = Array.isArray(locations) && locations.length > 0 ? locations : WEATHER_LOCATIONS;
  const settledResults = await Promise.allSettled(
    sourceLocations.map((location) => fetchWeatherForLocation(location, options))
  );

  const snapshots = [];
  const failed = [];

  settledResults.forEach((result, index) => {
    if (result.status === "fulfilled") {
      snapshots.push(result.value);
      return;
    }

    failed.push(result.reason);
    snapshots.push({
      ...createInitialWeatherCity(sourceLocations[index]),
      fetchFailed: true,
    });
  });

  if (failed.length === sourceLocations.length) {
    throw failed[0] || new Error("Failed to load weather data");
  }

  return snapshots;
}

export async function searchWeatherLocations(query, lang, options = {}) {
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
  clockNow,
  selectedCityId,
  setSelectedCityId,
  weatherCities,
  weatherStatus,
  weatherError,
  weatherUpdatedAt,
  onRefresh,
  onAddCity,
  onRemoveCity,
}) {
  const { lang, t } = useI18n();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchStatus, setSearchStatus] = useState("idle");
  const [searchError, setSearchError] = useState("");
  const [recentSearches, setRecentSearches] = useState(() => readRecentWeatherSearches());
  const [usageMap, setUsageMap] = useState(() => readWeatherUsageMap());

  const selectedCity = useMemo(
    () =>
      weatherCities.find((city) => city.id === selectedCityId) ||
      weatherCities[0] ||
      createInitialWeatherCity(WEATHER_LOCATIONS[0]),
    [selectedCityId, weatherCities]
  );

  useEffect(() => {
    const keyword = searchQuery.trim();
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
          setSearchResults(results);
          setSearchStatus("ready");
        })
        .catch((error) => {
          if (error?.name === "AbortError") {
            return;
          }
          setSearchResults([]);
          setSearchStatus("error");
          setSearchError(normalizeError(error));
        });
    }, 260);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [lang, searchQuery]);

  useEffect(() => {
    writeRecentWeatherSearches(recentSearches);
  }, [recentSearches]);

  useEffect(() => {
    writeWeatherUsageMap(usageMap);
  }, [usageMap]);

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

  function rememberCityUsage(city, options = {}) {
    const normalizedCity = sanitizeSearchSuggestion(city);
    const cityKey = getCityIdentity(normalizedCity);

    setUsageMap((prev) => ({
      ...prev,
      [cityKey]: {
        count: (prev?.[cityKey]?.count || 0) + 1,
        city: normalizedCity,
      },
    }));

    if (options.includeRecent !== false) {
      setRecentSearches((prev) => mergeRecentWeatherSearches(prev, normalizedCity));
    }
  }

  function handleSuggestionSelect(city) {
    const normalizedCity = sanitizeSearchSuggestion(city);
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
    <section className="weather-panel panel-surface">
      <div className={`weather-stage weather-stage--${selectedCity.tone}`}>
        <div className="weather-stage__toolbar">
          <div className="weather-stage__status">
            <span className={`status-chip ${resolveWeatherStatusClass(weatherStatus)}`}>
              {t(`app.weather.status.${weatherStatus}`)}
            </span>
            <span className="section-note">
              {weatherUpdatedAt
                ? t("app.weather.updatedAt", {
                    date: formatTime(weatherUpdatedAt, lang),
                  })
                : t("app.weather.updatedAtPending")}
            </span>
          </div>

          <div className="weather-stage__actions">
            <button
              type="button"
              className="ghost-button"
              onClick={onRefresh}
              disabled={weatherStatus === "loading"}
            >
              {weatherStatus === "loading" ? t("app.common.loading") : t("app.weather.refresh")}
            </button>
          </div>
        </div>

        {weatherError ? <div className="error-banner">{weatherError}</div> : null}

        <div className="weather-top-grid">
          <WeatherTiltCard className="weather-hero-card">
            <div className="weather-hero-card__sky" aria-hidden="true">
              <span className="weather-hero-card__orb" />
              <span className="weather-hero-card__ring weather-hero-card__ring--one" />
              <span className="weather-hero-card__ring weather-hero-card__ring--two" />
              <span className="weather-hero-card__glass weather-hero-card__glass--one" />
              <span className="weather-hero-card__glass weather-hero-card__glass--two" />
            </div>

            <div className="weather-hero-card__body">
              <div className="weather-hero-card__eyebrow-row">
                <span className="eyebrow">{t("app.weather.hero.eyebrow")}</span>
                <span className="weather-pill">
                  {formatCityTime(clockNow, selectedCity.timeZone, lang)}
                </span>
              </div>

              <div className="weather-hero-card__headline">
                <div>
                  <h3>{getCityName(selectedCity, t)}</h3>
                  <p>{getCityRegion(selectedCity, t)}</p>
                </div>
                <span className="weather-condition-pill">{t(selectedCity.conditionKey)}</span>
              </div>

              <div className="weather-hero-card__temperature">
                <strong>{selectedCity.temperature != null ? selectedCity.temperature : "--"}</strong>
                <span>{t("app.weather.unit.celsius")}</span>
              </div>

              <div className="weather-hero-card__summary">
                <p>{buildWeatherSummary({ city: selectedCity, t })}</p>
                <div className="weather-range-row">
                  <span>
                    {t("app.weather.metric.high")} {formatMetricValue(selectedCity.high, t("app.weather.unit.degree"))}
                  </span>
                  <span>
                    {t("app.weather.metric.low")} {formatMetricValue(selectedCity.low, t("app.weather.unit.degree"))}
                  </span>
                  <span>
                    {t("app.weather.metric.precipitation")} {selectedCity.precipitation ?? "--"}%
                  </span>
                </div>
              </div>
            </div>
          </WeatherTiltCard>

          <WeatherTiltCard className="weather-city-widget">
            <div className="weather-card-head">
              <div>
                <span className="eyebrow">{t("app.weather.cityWidget.eyebrow")}</span>
                <h3>{t("app.weather.cityWidget.title")}</h3>
              </div>
              <span className="section-note">
                {t("app.weather.cityWidget.count", { count: weatherCities.length })}
              </span>
            </div>

            <div className="weather-city-search">
              <input
                className="field-input"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t("app.weather.search.placeholder")}
              />

              <div className="weather-search-results">
                {searchSections.map((section) => (
                  <div key={section.key} className="weather-search-section">
                    <div className="weather-search-section__head">
                      <strong>{section.title}</strong>
                      <span>{section.items.length}</span>
                    </div>

                    {section.items.length > 0 ? (
                      section.items.map((result) => {
                        const alreadyAdded = weatherCityIds.has(getCityIdentity(result));
                        return (
                          <div key={`${section.key}-${result.id}`} className="weather-search-result">
                            <button
                              type="button"
                              className="weather-search-result__button"
                              onClick={() => handleSuggestionSelect(result)}
                            >
                              <div className="weather-search-result__copy">
                                <strong>{getCityName(result, t)}</strong>
                                <span>{getCityRegion(result, t)}</span>
                              </div>
                            </button>
                            <button
                              type="button"
                              className={`chip-button ${alreadyAdded ? "is-active" : ""}`}
                              onClick={() => handleSuggestionSelect(result)}
                            >
                              {alreadyAdded ? t("app.weather.search.open") : t("app.weather.search.add")}
                            </button>
                          </div>
                        );
                      })
                    ) : (
                      <div className="weather-search-empty">{section.empty}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="weather-city-widget__list">
              {weatherCities.map((city) => {
                const isActive = city.id === selectedCity.id;
                const canRemove = weatherCities.length > 1;
                return (
                  <article
                    key={city.id}
                    className={`weather-city-widget__item ${isActive ? "is-active" : ""}`}
                  >
                    <button
                      type="button"
                      className="weather-city-widget__select"
                      onClick={() => {
                        rememberCityUsage(city, { includeRecent: false });
                        setSelectedCityId(city.id);
                      }}
                    >
                      <span className={`weather-city-widget__icon weather-city-widget__icon--${city.tone}`} />
                      <div className="weather-city-widget__copy">
                        <strong>{getCityName(city, t)}</strong>
                        <span>{getCityRegion(city, t)}</span>
                      </div>
                      <div className="weather-city-widget__meta">
                        <strong>{formatMetricValue(city.temperature, t("app.weather.unit.degree"))}</strong>
                        <span>{formatCityTime(clockNow, city.timeZone, lang)}</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      className="weather-city-widget__remove"
                      onClick={() => {
                        if (canRemove) {
                          onRemoveCity(city.id);
                        }
                      }}
                      disabled={!canRemove}
                      aria-label={t("app.weather.cityWidget.remove")}
                    >
                      {t("app.weather.cityWidget.remove")}
                    </button>
                  </article>
                );
              })}
            </div>
          </WeatherTiltCard>
        </div>

        <div className="weather-metric-grid">
          {metricCards.map((card) => (
            <WeatherTiltCard key={card.label} className="weather-metric-card">
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <p>{card.detail}</p>
            </WeatherTiltCard>
          ))}
        </div>

        <div className="weather-bottom-grid">
          <WeatherTiltCard className="weather-forecast-card">
            <div className="weather-card-head">
              <div>
                <span className="eyebrow">{t("app.weather.hourly.eyebrow")}</span>
                <h3>{t("app.weather.hourly.title")}</h3>
              </div>
              <span className="section-note">{t("app.weather.hourly.range")}</span>
            </div>

            {selectedCity.hourly.length > 0 ? (
              <div className="weather-hourly-row">
                {selectedCity.hourly.map((hour, index) => (
                  <article key={`${selectedCity.id}-${hour.time}`} className="weather-hourly-chip">
                    <span>{formatHourlyLabel(hour, index, t)}</span>
                    <strong>{formatMetricValue(hour.temperature, t("app.weather.unit.degree"))}</strong>
                    <p>{t(hour.conditionKey)}</p>
                    <small>{hour.precipitation ?? "--"}%</small>
                  </article>
                ))}
              </div>
            ) : (
              <div className="weather-empty-state">{t("app.weather.emptyForecast")}</div>
            )}
          </WeatherTiltCard>

          <WeatherTiltCard className="weather-forecast-card">
            <div className="weather-card-head">
              <div>
                <span className="eyebrow">{t("app.weather.weekly.eyebrow")}</span>
                <h3>{t("app.weather.weekly.title")}</h3>
              </div>
              <span className="section-note">{t("app.weather.weekly.range")}</span>
            </div>

            {selectedCity.daily.length > 0 ? (
              <div className="weather-week-list">
                {selectedCity.daily.map((day, index) => (
                  <div key={`${selectedCity.id}-${day.time}`} className="weather-week-row">
                    <strong>{formatDailyLabel(day, index, lang, t)}</strong>
                    <span>{t(day.conditionKey)}</span>
                    <span>{day.precipitation ?? "--"}%</span>
                    <span>
                      {formatMetricValue(day.high, t("app.weather.unit.degree"))} / {formatMetricValue(day.low, t("app.weather.unit.degree"))}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="weather-empty-state">{t("app.weather.emptyForecast")}</div>
            )}
          </WeatherTiltCard>
        </div>

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
    </section>
  );
}

function createInitialWeatherCity(location) {
  return {
    ...location,
    temperature: null,
    high: null,
    low: null,
    feelsLike: null,
    humidity: null,
    wind: null,
    visibility: null,
    precipitation: null,
    sunrise: "--:--",
    sunset: "--:--",
    airQualityValue: null,
    airQualityKey: "",
    conditionKey: "app.weather.condition.loading",
    hourly: [],
    daily: [],
    updatedAt: null,
    fetchFailed: false,
  };
}

async function fetchWeatherForLocation(location, { signal } = {}) {
  const [forecastResponse, airQualityResponse] = await Promise.all([
    fetch(buildForecastUrl(location), { signal }),
    fetch(buildAirQualityUrl(location), { signal }),
  ]);

  if (!forecastResponse.ok) {
    throw new Error(`Weather API request failed for ${location.id}`);
  }

  const forecastPayload = await forecastResponse.json();
  const airQualityPayload = airQualityResponse.ok ? await airQualityResponse.json() : null;
  const current = forecastPayload?.current || {};
  const hourly = forecastPayload?.hourly || {};
  const daily = forecastPayload?.daily || {};
  const updatedAt = Date.now();
  const airQualityValue = Number(airQualityPayload?.current?.us_aqi);
  const windSpeed = normalizeNumber(current.wind_speed_10m);
  const currentHourlyIndex = findCurrentHourlyIndex(forecastPayload);

  return {
    ...location,
    temperature: roundNumber(current.temperature_2m),
    high: roundNumber(daily.temperature_2m_max?.[0]),
    low: roundNumber(daily.temperature_2m_min?.[0]),
    feelsLike: roundNumber(current.apparent_temperature),
    humidity: roundNumber(current.relative_humidity_2m),
    wind: roundNumber(windSpeed),
    visibility: roundToSingleDecimal(normalizeNumber(current.visibility) / 1000),
    precipitation: roundNumber(hourly.precipitation_probability?.[currentHourlyIndex]),
    sunrise: formatApiClock(daily.sunrise?.[0]),
    sunset: formatApiClock(daily.sunset?.[0]),
    airQualityValue: Number.isFinite(airQualityValue) ? Math.round(airQualityValue) : null,
    airQualityKey: mapAirQualityToKey(airQualityValue),
    conditionKey: mapWeatherCodeToKey(current.weather_code, windSpeed),
    hourly: buildHourlyForecast(forecastPayload),
    daily: buildDailyForecast(forecastPayload),
    updatedAt,
    fetchFailed: false,
  };
}

function buildForecastUrl(location) {
  const url = new URL(OPEN_METEO_FORECAST_URL);
  url.searchParams.set("latitude", String(location.latitude));
  url.searchParams.set("longitude", String(location.longitude));
  url.searchParams.set("timezone", "auto");
  url.searchParams.set(
    "current",
    [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "precipitation",
      "weather_code",
      "wind_speed_10m",
      "visibility",
    ].join(",")
  );
  url.searchParams.set(
    "hourly",
    ["temperature_2m", "precipitation_probability", "weather_code", "wind_speed_10m"].join(",")
  );
  url.searchParams.set(
    "daily",
    [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_probability_max",
      "sunrise",
      "sunset",
    ].join(",")
  );
  url.searchParams.set("forecast_days", "7");
  return url.toString();
}

function buildAirQualityUrl(location) {
  const url = new URL(OPEN_METEO_AIR_QUALITY_URL);
  url.searchParams.set("latitude", String(location.latitude));
  url.searchParams.set("longitude", String(location.longitude));
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("current", "us_aqi");
  return url.toString();
}

function buildHourlyForecast(payload) {
  const hourly = payload?.hourly || {};
  const times = Array.isArray(hourly.time) ? hourly.time : [];
  const startIndex = findCurrentHourlyIndex(payload);

  return times.slice(startIndex, startIndex + 6).map((time, index) => ({
    time,
    temperature: roundNumber(hourly.temperature_2m?.[startIndex + index]),
    precipitation: roundNumber(hourly.precipitation_probability?.[startIndex + index]),
    conditionKey: mapWeatherCodeToKey(
      hourly.weather_code?.[startIndex + index],
      hourly.wind_speed_10m?.[startIndex + index]
    ),
  }));
}

function buildDailyForecast(payload) {
  const daily = payload?.daily || {};
  const times = Array.isArray(daily.time) ? daily.time : [];

  return times.slice(0, 7).map((time, index) => ({
    time,
    high: roundNumber(daily.temperature_2m_max?.[index]),
    low: roundNumber(daily.temperature_2m_min?.[index]),
    precipitation: roundNumber(daily.precipitation_probability_max?.[index]),
    conditionKey: mapWeatherCodeToKey(daily.weather_code?.[index]),
  }));
}

function findCurrentHourlyIndex(payload) {
  const currentTime = String(payload?.current?.time || "");
  const times = Array.isArray(payload?.hourly?.time) ? payload.hourly.time : [];
  return Math.max(times.findIndex((time) => time >= currentTime), 0);
}

function mapWeatherCodeToKey(code, windSpeed) {
  const normalizedCode = Number(code);
  const normalizedWind = normalizeNumber(windSpeed);

  if (normalizedWind >= 38 && [0, 1, 2, 3].includes(normalizedCode)) {
    return "app.weather.condition.wind";
  }
  if (normalizedCode === 0) {
    return "app.weather.condition.bright";
  }
  if ([1, 2].includes(normalizedCode)) {
    return "app.weather.condition.partlyCloudy";
  }
  if (normalizedCode === 3) {
    return "app.weather.condition.cloudy";
  }
  if ([45, 48].includes(normalizedCode)) {
    return "app.weather.condition.mist";
  }
  if ([71, 73, 75, 77, 85, 86].includes(normalizedCode)) {
    return "app.weather.condition.snow";
  }
  if ([95, 96, 99].includes(normalizedCode)) {
    return "app.weather.condition.storm";
  }
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(normalizedCode)) {
    return "app.weather.condition.rain";
  }
  return "app.weather.condition.partlyCloudy";
}

function mapAirQualityToKey(value) {
  const normalizedValue = Number(value);
  if (!Number.isFinite(normalizedValue)) {
    return "";
  }
  if (normalizedValue <= 25) {
    return "app.weather.airQuality.excellent";
  }
  if (normalizedValue <= 50) {
    return "app.weather.airQuality.good";
  }
  if (normalizedValue <= 100) {
    return "app.weather.airQuality.fair";
  }
  if (normalizedValue <= 150) {
    return "app.weather.airQuality.moderate";
  }
  if (normalizedValue <= 200) {
    return "app.weather.airQuality.unhealthy";
  }
  if (normalizedValue <= 300) {
    return "app.weather.airQuality.veryUnhealthy";
  }
  return "app.weather.airQuality.hazardous";
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

function WeatherTiltCard({
  as: Component = "article",
  children,
  className = "",
  onMouseLeave,
  onMouseMove,
  ...props
}) {
  return (
    <Component
      {...props}
      className={["weather-tilt", className].filter(Boolean).join(" ")}
      onMouseMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        const rotateX = (0.5 - y) * 14;
        const rotateY = (x - 0.5) * 18;

        event.currentTarget.style.setProperty("--weather-rotate-x", `${rotateX.toFixed(2)}deg`);
        event.currentTarget.style.setProperty("--weather-rotate-y", `${rotateY.toFixed(2)}deg`);
        event.currentTarget.style.setProperty("--weather-glow-x", `${(x * 100).toFixed(2)}%`);
        event.currentTarget.style.setProperty("--weather-glow-y", `${(y * 100).toFixed(2)}%`);

        if (onMouseMove) {
          onMouseMove(event);
        }
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.setProperty("--weather-rotate-x", "0deg");
        event.currentTarget.style.setProperty("--weather-rotate-y", "0deg");
        event.currentTarget.style.setProperty("--weather-glow-x", "50%");
        event.currentTarget.style.setProperty("--weather-glow-y", "50%");

        if (onMouseLeave) {
          onMouseLeave(event);
        }
      }}
    >
      {children}
    </Component>
  );
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

function resolveWeatherStatusClass(status) {
  if (status === "ready") {
    return "status-completed";
  }
  if (status === "partial") {
    return "status-warning";
  }
  if (status === "error") {
    return "status-failed";
  }
  return "status-running";
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

function roundNumber(value) {
  const normalized = normalizeNumber(value);
  return normalized == null ? null : Math.round(normalized);
}

function roundToSingleDecimal(value) {
  const normalized = normalizeNumber(value);
  return normalized == null ? null : Number(normalized.toFixed(1));
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

function buildCommonCitySuggestions({ recentSearches, usageMap, weatherCities }) {
  const rankedUsageEntries = Object.values(usageMap || {})
    .filter((entry) => entry?.city)
    .sort((left, right) => (right?.count || 0) - (left?.count || 0))
    .map((entry) => sanitizeSearchSuggestion(entry.city));

  const merged = [];
  const seen = new Set();

  [...rankedUsageEntries, ...weatherCities, ...recentSearches].forEach((city) => {
    if (!city) {
      return;
    }
    const key = getCityIdentity(city);
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    merged.push(sanitizeSearchSuggestion(city));
  });

  return merged.slice(0, MAX_COMMON_CITY_SUGGESTIONS);
}

function mergeRecentWeatherSearches(current, city) {
  const normalizedCity = sanitizeSearchSuggestion(city);
  const currentList = Array.isArray(current) ? current : [];
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

function readRecentWeatherSearches() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(WEATHER_RECENT_SEARCHES_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map((city) => sanitizeSearchSuggestion(city)).filter(Boolean);
  } catch (error) {
    console.error("Failed to read recent weather searches", error);
    return [];
  }
}

function writeRecentWeatherSearches(entries) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(WEATHER_RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    console.error("Failed to write recent weather searches", error);
  }
}

function readWeatherUsageMap() {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(WEATHER_USAGE_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    return Object.entries(parsed).reduce((accumulator, [key, value]) => {
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
    }, {});
  } catch (error) {
    console.error("Failed to read weather usage map", error);
    return {};
  }
}

function writeWeatherUsageMap(usageMap) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(WEATHER_USAGE_STORAGE_KEY, JSON.stringify(usageMap));
  } catch (error) {
    console.error("Failed to write weather usage map", error);
  }
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
