import React, { useMemo, useState } from "react";
import { WEATHER_LOCATIONS } from "../weatherData";
import MobileSheet from "./MobileSheet";
import { AppTextField, MobileActionRow, MobileButton, MobileChip, MobileForm, MobileList, MobileRow, MobileRowBody, MobileEmpty, MobileMuted, MobileSectionHead } from "../ui";
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
}: Record<string, any>) {
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
        <MobileActionRow>
          <MobileButton variant="contained" mobileAction="primary" onClick={onRefresh}>
            {mobileText(lang, "refresh")}
          </MobileButton>
          <MobileButton
            variant="outlined"
            mobileAction="secondary"
            onClick={() => setCitySheetOpen(true)}
          >
            {mobileText(lang, "city")}
          </MobileButton>
        </MobileActionRow>
        <MobileMuted>
          {weatherStatus === "error"
            ? weatherError
            : weatherUpdatedAt
              ? t("app.weather.updatedAt", { date: formatMobileWeatherTime(weatherUpdatedAt, lang) })
              : t("app.weather.updatedAtPending")}
        </MobileMuted>
      </section>

      <section className="mobile-section">
        <MobileList variant="metrics">
          {metrics.map((metric) => (
            <MobileRow key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </MobileRow>
          ))}
        </MobileList>
      </section>

      <section className="mobile-section">
        <MobileSectionHead line>
          <h2>{mobileText(lang, "hourly")}</h2>
        </MobileSectionHead>
        <div className="mobile-weather-strip">
          {(activeWeatherCity?.hourly || []).length === 0 ? (
            <MobileEmpty>{t("app.weather.emptyForecast")}</MobileEmpty>
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
        <MobileSectionHead line>
          <h2>{mobileText(lang, "weekly")}</h2>
        </MobileSectionHead>
        <MobileList>
          {(activeWeatherCity?.daily || []).slice(0, 7).map((item) => (
            <MobileRow key={item.time}>
              <MobileRowBody>
                <strong>{formatMobileWeatherDate(item.time, lang)}</strong>
                <span>{item.conditionKey ? t(item.conditionKey) : "--"}</span>
              </MobileRowBody>
              <span>{valueWithDegree(item.high, t)} / {valueWithDegree(item.low, t)}</span>
            </MobileRow>
          ))}
        </MobileList>
      </section>

      <MobileSheet
        id="mobile-weather-cities"
        open={citySheetOpen}
        onClose={() => setCitySheetOpen(false)}
        closeLabel={mobileText(lang, "close")}
        title={mobileText(lang, "citySheet")}
      >
        <MobileForm compact>
          <AppTextField fieldClassName="mobile-field"
            label={mobileText(lang, "search")}
            value={cityQuery}
            onChange={(event) => setCityQuery(event.target.value)}
            placeholder={t("app.weather.search.placeholder")}
            fullWidth
            size="small"
          />
        </MobileForm>
        <MobileList>
          {weatherCities.map((city) => (
            <MobileRow key={city.id} active={city.id === selectedWeatherCityId}>
              <MobileButton
                variant="text"
                className="mobile-row__body"
                onClick={() => {
                  setSelectedWeatherCityId(city.id);
                  setCitySheetOpen(false);
                }}
              >
                <strong>{resolveWeatherCityName(city, t)}</strong>
                <span>{resolveWeatherCondition(city, t)}</span>
              </MobileButton>
              <MobileChip
                clickable
                color="default"
                variant="outlined"
                label={mobileText(lang, "remove")}
                onClick={() => onRemoveWeatherCity(city.id)}
                disabled={weatherCities.length <= 1}
              />
            </MobileRow>
          ))}
        </MobileList>
        <MobileList variant="suggestions">
          {citySuggestions.map((city) => {
            const isSaved = savedLocationIds.has(city.id);
            return (
              <MobileRow key={city.id}>
                <MobileRowBody>
                  <strong>{resolveWeatherCityName(city, t)}</strong>
                  <span>{resolveWeatherRegion(city, t)}</span>
                </MobileRowBody>
                <MobileChip
                  clickable
                  color={isSaved ? "primary" : "default"}
                  variant={isSaved ? "filled" : "outlined"}
                  active={isSaved}
                  label={isSaved ? t("app.weather.search.open") : t("app.weather.search.add")}
                  onClick={() => {
                    if (!isSaved) {
                      onAddWeatherCity(city);
                    }
                    setSelectedWeatherCityId(city.id);
                  }}
                />
              </MobileRow>
            );
          })}
        </MobileList>
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



