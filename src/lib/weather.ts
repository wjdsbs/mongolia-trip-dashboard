import { TIMEZONE, type PlaceKey } from "@/config/trip";
export type HourPoint = {
  hour: number;
  temp: number;
  feels: number;
  precipProb: number | null;
  precip: number;
  snow: number;
  code: number;
  isDay: boolean;
  wind: number;
  gust: number;
};
export type DayPlace = {
  place: PlaceKey;
  hours: HourPoint[];
  summary: {
    code: number;
    min: number;
    max: number;
    feelsMin: number;
    precipProbMax: number | null;
    precipSum: number;
    snowSum: number;
    gustMax: number;
    sunrise: string;
    sunset: string;
  } | null;
  night?: {
    moonPhase: number;
    moonIllumination: number;
    moonrise: string | null;
    moonset: string | null;
    cloudAvg: number | null;
    moonUp: boolean;
  };
};
export type WeatherResponse = {
  fetchedAt: string;
  current: Record<
    PlaceKey,
    { temp: number; feels: number; code: number; isDay: boolean } | null
  >;
  days: { date: string; places: DayPlace[] }[];
};
export function localDate(date: Date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
export function localTime(date: Date = new Date()) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}
export function tripStatus(date: string) {
  const diff = Math.round(
    (Date.parse(date) - Date.parse("2026-09-23")) / 86400000,
  );
  return diff < 0
    ? `출발 D-${-diff}`
    : diff < 3
      ? `여행 ${diff + 1}일차`
      : "여행 끝";
}
export function weatherLabel(code: number) {
  if (code === 0) return "맑음";
  if (code === 1) return "대체로 맑음";
  if (code === 2) return "구름 조금";
  if (code === 3) return "흐림";
  if ([45, 48].includes(code)) return "안개";
  if ([56, 57, 66, 67].includes(code)) return "어는 비";
  if (code >= 95) return "뇌우";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "눈";
  if (code >= 80) return "소나기";
  if (code >= 61) return "비";
  if (code >= 51) return "이슬비";
  return "정보 없음";
}
export function weatherKind(code: number, isDay = true) {
  if (code <= 1) return isDay ? "sun" : "moon";
  if (code === 2) return "partly";
  if (code === 3) return "cloud";
  if ([45, 48].includes(code)) return "fog";
  if (code >= 95) return "storm";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
  return "rain";
}
export function warnings(s: NonNullable<DayPlace["summary"]>) {
  return [
    (s.precipProbMax ?? 0) >= 50 || s.precipSum >= 0.5
      ? "비 가능성 높음"
      : null,
    s.snowSum > 0 ? "눈 예보" : null,
    s.gustMax >= 12 ? "돌풍 강함" : null,
    s.feelsMin <= 0 ? "체감 영하" : null,
  ].filter((x): x is string => Boolean(x));
}
export function starVerdict(n: NonNullable<DayPlace["night"]>) {
  if (n.cloudAvg === null) return "구름 예보 대기";
  return n.cloudAvg >= 60 || (n.moonIllumination >= 50 && n.moonUp)
    ? "별 보기 어려움"
    : "별 보기 좋음";
}
export function temperatureDomain(places: DayPlace[]): [number, number] {
  const values = places.flatMap((p) =>
    p.hours.flatMap((h) => [h.temp, h.feels]),
  );
  return values.length
    ? [
        Math.floor((Math.min(0, ...values) - 2) / 5) * 5,
        Math.ceil((Math.max(0, ...values) + 2) / 5) * 5,
      ]
    : [-5, 20];
}
export function isWeatherResponse(v: unknown): v is WeatherResponse {
  if (!v || typeof v !== "object") return false;
  const r = v as WeatherResponse;
  return (
    typeof r.fetchedAt === "string" &&
    Number.isFinite(Date.parse(r.fetchedAt)) &&
    !!r.current &&
    ["ub", "desert", "terelj"].every((k) => k in r.current) &&
    Array.isArray(r.days) &&
    r.days.length === 3 &&
    r.days.every(
      (d) =>
        typeof d.date === "string" &&
        Array.isArray(d.places) &&
        d.places.every(
          (p) =>
            p.place in { ub: 1, desert: 1, terelj: 1 } &&
            Array.isArray(p.hours) &&
            p.hours.every(
              (h) =>
                Number.isFinite(h.temp) &&
                Number.isFinite(h.feels) &&
                Number.isFinite(h.gust),
            ),
        ),
    )
  );
}
