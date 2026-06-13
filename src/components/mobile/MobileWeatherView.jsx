import React, { useMemo, useState } from "react";
import { WEATHER_LOCATIONS } from "../weatherData";
import MobileSheet from "./MobileSheet";
import {
  formatMobileWeatherDate,
  formatMobileWeatherTime,
  mobileText,
  resolveWeatherCityName,
  resolveWeatherCondition,
  resolveWeatherRegion,
} from "./mobileText";

function MobileWeatherView({
  activeWeatherCity,
  lang,
  onAddWeatherCity,
  onRefresh,
  onRemoveWeatherCity,
  selectedWeatherCityId,
  setSelectedWeatherCityId,
  t,
  weatherCities = [],
  weatherError,
  weatherLocations = [],
  weatherStatus,
  weatherUpdatedAt,
}) {
  const [citySheetOpen, setCitySheetOpen] = useState(false);
  const [cityQuery, setCityQuery] = useState("");
  const savedLocationIds = new Set(weatherLocations.map((city) => city.id));
  const citySuggestions = useMemo(() => {
    const needle = cityQuery.trim().toLowerCase();
    return WEATHER_LOCATIONS.filter((city) => {
      const label = [city.name, city.region, city.id, city.nameKey ? t(city.nameKey) : ""]
        .join(" ")
        .toLowerCase();
      return !needle || label.includes(needle);
    });
  }, [cityQuery, t]);
  const metrics = [
    { label: t("app.weather.metric.feelsLike"), value: valueWithDegree(activeWeatherCity?.feelsLike, t) },
    { label: t("app.weather.metric.humidity"), value: percentageValue(activeWeatherCity?.humidity) },
    { label: t("app.weather.metric.wind"), value: windValue(activeWeatherCity?.wind, t) },
    {
      label: mobileText(lang, "highLow"),
      value: `${valueWithDegree(activeWeatherCity?.high, t)} / ${valueWithDegree(activeWeatherCity?.low, t)}`,
    },
  ];

  return (
    <div className="mobile-page mobile-page--weather">
      <section className="mobile-section mobile-section--flush">
        <div className="mobile-weather-current">
          <div>
            <span className="mobile-eyebrow">{resolveWeatherRegion(activeWeatherCity, t)}</span>
            <h1>{resolveWeatherCityName(activeWeatherCity, t)}</h1>
            <p>{resolveWeatherCondition(activeWeatherCity, t)}</p>
          </div>
          <strong>{valueWithDegree(activeWeatherCity?.temperature, t)}</strong>
        </div>
        <div className="mobile-action-row">
          <button type="button" className="mobile-primary-action" onClick={onRefresh}>
            {mobileText(lang, "refresh")}
          </button>
          <button type="button" className="mobile-secondary-action" onClick={() => setCitySheetOpen(true)}>
            {mobileText(lang, "city")}
          </button>
        </div>
        <p className="mobile-muted">
          {weatherStatus === "error"
            ? weatherError
            : weatherUpdatedAt
              ? t("app.weather.updatedAt", { date: formatMobileWeatherTime(weatherUpdatedAt, lang) })
              : t("app.weather.updatedAtPending")}
        </p>
      </section>

      <section className="mobile-section">
        <div className="mobile-list mobile-list--metrics">
          {metrics.map((metric) => (
            <div key={metric.label} className="mobile-row">
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="mobile-section">
        <div className="mobile-section__head mobile-section__head--line">
          <h2>{mobileText(lang, "hourly")}</h2>
        </div>
        <div className="mobile-weather-strip">
          {(activeWeatherCity?.hourly || []).length === 0 ? (
            <p className="mobile-empty">{t("app.weather.emptyForecast")}</p>
          ) : (
            activeWeatherCity.hourly.map((item) => (
              <div key={item.time} className="mobile-weather-chip">
                <time>{formatMobileWeatherTime(item.time, lang)}</time>
                <strong>{valueWithDegree(item.temperature, t)}</strong>
                <span>{percentageValue(item.precipitation)}</span>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="mobile-section">
        <div className="mobile-section__head mobile-section__head--line">
          <h2>{mobileText(lang, "weekly")}</h2>
        </div>
        <div className="mobile-list">
          {(activeWeatherCity?.daily || []).slice(0, 7).map((item) => (
            <div key={item.time} className="mobile-row">
              <span className="mobile-row__body">
                <strong>{formatMobileWeatherDate(item.time, lang)}</strong>
                <span>{item.conditionKey ? t(item.conditionKey) : "--"}</span>
              </span>
              <span>{valueWithDegree(item.high, t)} / {valueWithDegree(item.low, t)}</span>
            </div>
          ))}
        </div>
      </section>

      <MobileSheet
        id="mobile-weather-cities"
        open={citySheetOpen}
        onClose={() => setCitySheetOpen(false)}
        closeLabel={mobileText(lang, "close")}
        title={mobileText(lang, "citySheet")}
      >
        <div className="mobile-form mobile-form--compact">
          <label>
            <span>{mobileText(lang, "search")}</span>
            <input
              value={cityQuery}
              onChange={(event) => setCityQuery(event.target.value)}
              placeholder={t("app.weather.search.placeholder")}
            />
          </label>
        </div>
        <div className="mobile-list">
          {weatherCities.map((city) => (
            <div key={city.id} className={`mobile-row ${city.id === selectedWeatherCityId ? "is-active" : ""}`}>
              <button
                type="button"
                className="mobile-row__body"
                onClick={() => {
                  setSelectedWeatherCityId(city.id);
                  setCitySheetOpen(false);
                }}
              >
                <strong>{resolveWeatherCityName(city, t)}</strong>
                <span>{resolveWeatherCondition(city, t)}</span>
              </button>
              <button
                type="button"
                className="mobile-pill-button"
                onClick={() => onRemoveWeatherCity(city.id)}
                disabled={weatherCities.length <= 1}
              >
                {mobileText(lang, "remove")}
              </button>
            </div>
          ))}
        </div>
        <div className="mobile-list mobile-list--suggestions">
          {citySuggestions.map((city) => {
            const isSaved = savedLocationIds.has(city.id);
            return (
              <div key={city.id} className="mobile-row">
                <span className="mobile-row__body">
                  <strong>{resolveWeatherCityName(city, t)}</strong>
                  <span>{resolveWeatherRegion(city, t)}</span>
                </span>
                <button
                  type="button"
                  className={`mobile-pill-button ${isSaved ? "is-active" : ""}`}
                  onClick={() => {
                    if (!isSaved) {
                      onAddWeatherCity(city);
                    }
                    setSelectedWeatherCityId(city.id);
                  }}
                >
                  {isSaved ? t("app.weather.search.open") : t("app.weather.search.add")}
                </button>
              </div>
            );
          })}
        </div>
      </MobileSheet>
    </div>
  );
}

function valueWithDegree(value, t) {
  return value == null ? "--" : `${value}${t("app.weather.unit.degree")}`;
}

function percentageValue(value) {
  return value == null ? "--" : `${value}%`;
}

function windValue(value, t) {
  return value == null ? "--" : `${value} ${t("app.weather.unit.wind")}`;
}

export default MobileWeatherView;
