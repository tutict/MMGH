import { useMemo, useState } from "react";
import { WEATHER_LOCATIONS } from "../weatherData";
import MobileSheet from "./MobileSheet";
import {
  MobileButton,
  MobileEmpty,
  MobileForm,
  MobileList,
  MobileMuted,
  MobilePage,
  MobileRow,
  MobileRowBody,
  MobileSection,
  MobileSectionHead,
  MobileTextField,
} from "../ui";
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
  const citySuggestions = useMemo(() => {
    const savedLocationIds = new Set(weatherLocations.map((city) => city.id));
    const needle = cityQuery.trim().toLowerCase();
    return WEATHER_LOCATIONS.filter((city) => {
      if (savedLocationIds.has(city.id)) {
        return false;
      }
      const label = [city.name, city.region, city.id, city.nameKey ? t(city.nameKey) : ""]
        .join(" ")
        .toLowerCase();
      return !needle || label.includes(needle);
    });
  }, [cityQuery, t, weatherLocations]);
  const hourly = activeWeatherCity?.hourly || [];
  const daily = activeWeatherCity?.daily || [];
  const hasReading = activeWeatherCity?.temperature != null;
  const weatherFailed = weatherStatus === "error";
  const facts = [
    { label: t("app.weather.metric.feelsLike"), value: valueWithDegree(activeWeatherCity?.feelsLike, t) },
    { label: t("app.weather.metric.humidity"), value: percentageValue(activeWeatherCity?.humidity) },
    { label: t("app.weather.metric.wind"), value: windValue(activeWeatherCity?.wind, t) },
    {
      label: mobileText(lang, "highLow"),
      value: `${valueWithDegree(activeWeatherCity?.high, t)} / ${valueWithDegree(activeWeatherCity?.low, t)}`,
    },
  ];
  const statusLabel = weatherFailed
    ? weatherError
    : weatherUpdatedAt
      ? t("app.weather.updatedAt", { date: formatMobileWeatherTime(weatherUpdatedAt, lang) })
      : t("app.weather.updatedAtPending");

  return (
    <MobilePage view="weather">
      <section className="mobile-weather-hero">
        <p className="mobile-weather-hero__city">{resolveWeatherCityName(activeWeatherCity, t)}</p>
        <strong className="mobile-weather-hero__temp">
          {valueWithDegree(activeWeatherCity?.temperature, t)}
        </strong>
        <p className={weatherFailed ? "mobile-weather-hero__meta is-error" : "mobile-weather-hero__meta"}>
          {hasReading
            ? `${resolveWeatherCondition(activeWeatherCity, t)} · ${statusLabel}`
            : statusLabel}
        </p>
        <div className="mobile-weather-hero__actions">
          <MobileButton variant="text" onClick={() => setCitySheetOpen(true)}>
            {mobileText(lang, "city")}
          </MobileButton>
          <MobileButton variant="text" onClick={onRefresh}>
            {mobileText(lang, "refresh")}
          </MobileButton>
        </div>
      </section>

      <div className="mobile-weather-facts">
        {facts.map((fact) => (
          <div key={fact.label} className="mobile-weather-fact">
            <span>{fact.label}</span>
            <strong>{fact.value}</strong>
          </div>
        ))}
      </div>

      {hourly.length === 0 && daily.length === 0 ? (
        <MobileEmpty>{t("app.weather.emptyForecast")}</MobileEmpty>
      ) : null}

      {hourly.length > 0 ? (
        <MobileSection>
          <MobileSectionHead line>
            <h2>{mobileText(lang, "hourly")}</h2>
          </MobileSectionHead>
          <div className="mobile-weather-strip">
            {hourly.map((item) => (
              <div key={item.time} className="mobile-weather-chip">
                <time dateTime={item.time}>{formatMobileWeatherTime(item.time, lang)}</time>
                <span className="mobile-weather-chip__reading">
                  <strong>{valueWithDegree(item.temperature, t)}</strong>
                  <span>{percentageValue(item.precipitation)}</span>
                </span>
              </div>
            ))}
          </div>
        </MobileSection>
      ) : null}

      {daily.length > 0 ? (
        <MobileSection>
          <MobileSectionHead line>
            <h2>{mobileText(lang, "weekly")}</h2>
          </MobileSectionHead>
          <MobileList>
            {daily.slice(0, 7).map((item) => (
              <MobileRow key={item.time}>
                <MobileRowBody>
                  <strong>
                    <time dateTime={item.time}>{formatMobileWeatherDate(item.time, lang)}</time>
                  </strong>
                  <span>{item.conditionKey ? t(item.conditionKey) : "--"}</span>
                </MobileRowBody>
                <span className="mobile-weather-range">
                  {valueWithDegree(item.high, t)} / {valueWithDegree(item.low, t)}
                </span>
              </MobileRow>
            ))}
          </MobileList>
        </MobileSection>
      ) : null}

      <MobileSheet
        id="mobile-weather-cities"
        open={citySheetOpen}
        onClose={() => setCitySheetOpen(false)}
        closeLabel={mobileText(lang, "close")}
        title={mobileText(lang, "citySheet")}
      >
        <MobileForm compact>
          <MobileTextField
            label={mobileText(lang, "search")}
            value={cityQuery}
            onChange={(event) => setCityQuery(event.target.value)}
            placeholder={t("app.weather.search.placeholder")}
            fullWidth
            size="small"
          />
        </MobileForm>
        <div className="mobile-weather-city-groups">
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
                <MobileButton
                  variant="text"
                  className="mobile-row__action"
                  aria-label={`${mobileText(lang, "remove")} ${resolveWeatherCityName(city, t)}`}
                  onClick={() => onRemoveWeatherCity(city.id)}
                  disabled={weatherCities.length <= 1}
                >
                  {mobileText(lang, "remove")}
                </MobileButton>
              </MobileRow>
            ))}
          </MobileList>
          {citySuggestions.length > 0 ? (
            <>
              <MobileMuted>{t("app.weather.search.section.results")}</MobileMuted>
              <MobileList>
                {citySuggestions.map((city) => (
                  <MobileRow key={city.id}>
                    <MobileRowBody>
                      <strong>{resolveWeatherCityName(city, t)}</strong>
                      <span>{resolveWeatherRegion(city, t)}</span>
                    </MobileRowBody>
                    <MobileButton
                      variant="text"
                      className="mobile-row__action"
                      aria-label={`${t("app.weather.search.add")} ${resolveWeatherCityName(city, t)}`}
                      onClick={() => {
                        onAddWeatherCity(city);
                        setSelectedWeatherCityId(city.id);
                      }}
                    >
                      {t("app.weather.search.add")}
                    </MobileButton>
                  </MobileRow>
                ))}
              </MobileList>
            </>
          ) : null}
        </div>
      </MobileSheet>
    </MobilePage>
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
