const OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const OPEN_METEO_AIR_QUALITY_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";

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

export function createInitialWeatherCity(location) {
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

function formatApiClock(value) {
  if (!value) {
    return "--:--";
  }
  return String(value).slice(11, 16);
}
