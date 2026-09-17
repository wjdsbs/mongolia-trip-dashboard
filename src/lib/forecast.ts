import SunCalc from "suncalc";
import { PLACES, TRIP_DAYS, type PlaceKey } from "@/config/trip";
import { type DayPlace, type HourPoint, type WeatherResponse } from "./weather";
export type RawForecast = {
  current?: {
    temperature_2m: number | null;
    apparent_temperature: number | null;
    weather_code: number | null;
    is_day: number;
  };
  hourly: { time: string[]; [key: string]: (number | null)[] | string[] };
  daily: { time: string[]; sunrise: string[]; sunset: string[] };
};
const finite = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);
export function moonInfo(
  date: string,
  place: PlaceKey,
  cloudAvg: number | null,
): NonNullable<DayPlace["night"]> {
  const { lat, lon } = PLACES[place];
  const start = new Date(`${date}T00:00:00+08:00`);
  const end = new Date(+start + 86400000);
  const illumination = SunCalc.getMoonIllumination(
    new Date(`${date}T22:00:00+08:00`),
  );
  const events = [-1, 0, 1]
    .flatMap((offset) => {
      const t = SunCalc.getMoonTimes(
        new Date(Date.parse(`${date}T00:00:00Z`) + offset * 86400000),
        lat,
        lon,
        true,
      );
      return [
        { kind: "rise", date: t.rise },
        { kind: "set", date: t.set },
      ];
    })
    .filter((e) => e.date && e.date >= start && e.date < end);
  const nightStart = new Date(`${date}T21:00:00+08:00`);
  const moonUp =
    SunCalc.getMoonPosition(nightStart, lat, lon).altitude > 0 ||
    events.some((e) => e.kind === "rise" && e.date! >= nightStart);
  return {
    moonPhase: illumination.phase,
    moonIllumination: illumination.fraction * 100,
    moonrise:
      events.find((e) => e.kind === "rise")?.date?.toISOString() ?? null,
    moonset: events.find((e) => e.kind === "set")?.date?.toISOString() ?? null,
    cloudAvg,
    moonUp,
  };
}
export function normalizeForecast(
  raw: RawForecast[],
  now = new Date(),
): WeatherResponse {
  if (
    !Array.isArray(raw) ||
    raw.length !== 3 ||
    raw.some((r) => !r?.hourly?.time || !r?.daily?.time)
  )
    throw new Error("잘못된 예보 응답");
  const keys = Object.keys(PLACES) as PlaceKey[];
  const current = Object.fromEntries(
    keys.map((key, i) => {
      const c = raw[i].current;
      return [
        key,
        c &&
        finite(c.temperature_2m) &&
        finite(c.apparent_temperature) &&
        finite(c.weather_code)
          ? {
              temp: c.temperature_2m,
              feels: c.apparent_temperature,
              code: c.weather_code,
              isDay: c.is_day === 1,
            }
          : null,
      ];
    }),
  ) as WeatherResponse["current"];
  const days = TRIP_DAYS.map((trip) => ({
    date: trip.date,
    places: trip.places.map((place) => {
      const r = raw[keys.indexOf(place)];
      const h = r.hourly;
      const at = (key: string, i: number) => h[key]?.[i];
      const hours: HourPoint[] = [];
      h.time.forEach((time, i) => {
        if (!time.startsWith(trip.date)) return;
        const required = [
          "temperature_2m",
          "apparent_temperature",
          "precipitation",
          "snowfall",
          "weather_code",
          "wind_speed_10m",
          "wind_gusts_10m",
          "is_day",
        ];
        if (!required.every((key) => finite(at(key, i)))) return;
        const n = (key: string) => at(key, i) as number;
        hours.push({
          hour: Number(time.slice(11, 13)),
          temp: n("temperature_2m"),
          feels: n("apparent_temperature"),
          precipProb: finite(at("precipitation_probability", i))
            ? n("precipitation_probability")
            : null,
          precip: n("precipitation"),
          snow: n("snowfall"),
          code: n("weather_code"),
          isDay: n("is_day") === 1,
          wind: n("wind_speed_10m"),
          gust: n("wind_gusts_10m"),
        });
      });
      const complete = hours.length === 24;
      const d = r.daily.time.indexOf(trip.date);
      const max = (key: "temp" | "gust") =>
        Math.max(...hours.map((h) => h[key]));
      const sum = (key: "precip" | "snow") =>
        hours.reduce((n, h) => n + h[key], 0);
      const probabilities = hours.map((h) => h.precipProb).filter(finite);
      const severity = (code: number) => ([45, 48].includes(code) ? 3.5 : code);
      const worst = hours
        .filter((h) => h.hour >= 6 && h.hour <= 18)
        .sort((a, b) => severity(b.code) - severity(a.code))[0];
      const result: DayPlace = {
        place,
        hours: complete ? hours : [],
        summary: complete
          ? {
              code: worst.code,
              min: Math.min(...hours.map((h) => h.temp)),
              max: max("temp"),
              feelsMin: Math.min(...hours.map((h) => h.feels)),
              precipProbMax: probabilities.length
                ? Math.max(...probabilities)
                : null,
              precipSum: sum("precip"),
              snowSum: sum("snow"),
              gustMax: max("gust"),
              sunrise: r.daily.sunrise[d] ?? "",
              sunset: r.daily.sunset[d] ?? "",
            }
          : null,
      };
      if (trip.stay === place) {
        const clouds = h.time.flatMap((t, i) =>
          t.startsWith(trip.date) &&
          Number(t.slice(11, 13)) >= 21 &&
          finite(at("cloud_cover", i))
            ? [at("cloud_cover", i) as number]
            : [],
        );
        result.night = moonInfo(
          trip.date,
          place,
          clouds.length === 3 ? clouds.reduce((a, b) => a + b, 0) / 3 : null,
        );
      }
      return result;
    }),
  }));
  return { fetchedAt: now.toISOString(), current, days };
}
