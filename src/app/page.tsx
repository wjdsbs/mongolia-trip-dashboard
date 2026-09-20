"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  RefreshCw,
  MapPin,
  Sunrise,
  Sunset,
  Wind,
  Droplets,
  Stars,
} from "lucide-react";
import { PLACES, TRIP_DAYS, type PlaceKey } from "@/config/trip";
import {
  isWeatherResponse,
  localDate,
  localTime,
  tripStatus,
  sunnyWishStatus,
  temperatureDomain,
  warnings,
  starVerdict,
  weatherLabel,
  type WeatherResponse,
} from "@/lib/weather";
import { WeatherIcon } from "@/components/weather-icon";
import { HourlyChart } from "@/components/hourly-chart";
import { DayMap } from "@/components/day-map";
import { CurrencyConverter } from "@/components/currency-converter";
const STORAGE = "mongolia-weather-v2";
const moonIcons = ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"];
export default function Home() {
  const [data, setData] = useState<WeatherResponse | null>(null);
  const [date, setDate] = useState(TRIP_DAYS[0].date);
  const [view, setView] = useState<"weather" | "map" | "currency">("weather");
  const [now, setNow] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const busy = useRef(false);
  const lastSuccess = useRef(0);
  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    try {
      const response = await fetch("/api/weather", {
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) throw new Error("fetch");
      const result: unknown = await response.json();
      if (!isWeatherResponse(result)) throw new Error("invalid");
      setData(result);
      setError(false);
      lastSuccess.current = Date.parse(result.fetchedAt);
      try {
        localStorage.setItem(STORAGE, JSON.stringify(result));
      } catch {}
    } catch {
      setError(true);
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const current = new Date();
    setNow(current);
    const today = localDate(current);
    if (TRIP_DAYS.some((d) => d.date === today)) setDate(today);
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE) ?? "null");
      if (isWeatherResponse(stored)) {
        setData(stored);
        lastSuccess.current = Date.parse(stored.fetchedAt);
      }
    } catch {}
    void refresh();
    const visible = () => {
      if (document.visibilityState === "visible") {
        setNow(new Date());
        if (Date.now() - lastSuccess.current >= 900000) void refresh();
      }
    };
    document.addEventListener("visibilitychange", visible);
    const clock = setInterval(() => setNow(new Date()), 60000);
    return () => {
      document.removeEventListener("visibilitychange", visible);
      clearInterval(clock);
    };
  }, [refresh]);
  const day = data?.days.find((d) => d.date === date);
  const trip = TRIP_DAYS.find((d) => d.date === date)!;
  const domain = temperatureDomain(day?.places ?? []);
  const today = now ? localDate(now) : "";
  return (
    <main>
      <header>
        <div className="eyebrow">
          <span className="trip-mark">M</span> OUR LITTLE MONGOLIA TRIP{" "}
          <span className="year">2026</span>
        </div>
        <div className="title-row">
          <div>
            <p className="kicker">9월 23일 — 25일 · 2박 3일</p>
            <h1>부엉부엉🦉몽골여행</h1>
            <p className="wish-day">{now ? sunnyWishStatus() : "햇님 기원"}</p>
          </div>
          <span className="status">{now ? tripStatus() : "몽골 여행"}</span>
        </div>
        <div className="header-bottom">
          <span>
            몽골 현지 <b>{now ? localTime(now) : "--:--"}</b>
            <span className="time-note">한국보다 1시간 느려요</span>
          </span>
          <button
            className="refresh"
            disabled={loading}
            onClick={() => void refresh()}
            aria-label="날씨 새로고침"
          >
            <RefreshCw size={15} className={loading ? "spinning" : ""} />
            <span>{loading ? "불러오는 중" : "새로고침"}</span>
          </button>
        </div>
      </header>
      {error && (
        <div className="error" role="alert">
          {data
            ? "연결이 안 돼 저장된 예보를 보여주는 중"
            : "날씨를 불러오지 못했어요. 연결을 확인한 뒤 새로고침해 주세요."}
        </div>
      )}
      <section aria-label="세 지역 현재 날씨" className="current-section">
        <div className="section-caption">
          <span>
            <i className="live-dot" /> 현재 몽골 날씨
          </span>
          <span>
            {data
              ? `${localDate(new Date(data.fetchedAt)).slice(5).replace("-", "/")} ${localTime(new Date(data.fetchedAt))} 업데이트`
              : "예보를 확인하고 있어요"}
          </span>
        </div>
        <div className="current-grid">
          {(Object.keys(PLACES) as PlaceKey[]).map((key) => {
            const p = PLACES[key];
            const c = data?.current[key];
            return (
              <div
                key={key}
                className="current-place"
                style={{ "--place": p.color } as React.CSSProperties}
              >
                <span className="place-name">
                  <i />
                  {p.name}
                </span>
                <div className="current-temp">
                  {c ? (
                    <>
                      <WeatherIcon code={c.code} isDay={c.isDay} size={30} />
                      <strong>
                        {Math.round(c.temp)}
                        <small>°</small>
                      </strong>
                    </>
                  ) : (
                    <strong className="placeholder">—°</strong>
                  )}
                </div>
                <span className="current-desc">
                  {c ? weatherLabel(c.code) : loading ? "확인 중" : "정보 없음"}
                </span>
              </div>
            );
          })}
        </div>
      </section>
      <div className="forecast-controls">
        <nav className="view-tabs" aria-label="화면 선택">
          <button
            type="button"
            aria-pressed={view === "weather"}
            onClick={() => setView("weather")}
          >
            날씨
          </button>
          <button
            type="button"
            aria-pressed={view === "map"}
            onClick={() => setView("map")}
          >
            위치·경로 지도
          </button>
          <button
            type="button"
            aria-pressed={view === "currency"}
            onClick={() => setView("currency")}
          >
            환율 계산기
          </button>
        </nav>
        <nav
          hidden={view === "currency"}
          className="date-tabs"
          role="tablist"
          aria-label="여행 날짜"
        >
          {TRIP_DAYS.map((d, i) => (
            <button
              key={d.date}
              id={`tab-${d.date}`}
              role="tab"
              aria-selected={date === d.date}
              aria-controls="day-panel"
              tabIndex={date === d.date ? 0 : -1}
              onClick={() => setDate(d.date)}
              onKeyDown={(e) => {
                if (
                  ["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)
                ) {
                  e.preventDefault();
                  const next =
                    e.key === "Home"
                      ? 0
                      : e.key === "End"
                        ? 2
                        : (i + (e.key === "ArrowRight" ? 1 : 2)) % 3;
                  setDate(TRIP_DAYS[next].date);
                  document
                    .getElementById(`tab-${TRIP_DAYS[next].date}`)
                    ?.focus();
                }
              }}
            >
              <span>
                DAY 0{i + 1}
                {today === d.date ? " · 오늘" : ""}
              </span>
              <strong>
                9/{23 + i} <small>{["수", "목", "금"][i]}</small>
              </strong>
            </button>
          ))}
        </nav>
      </div>
      <div className="route-caption" hidden={view === "currency"}>
        <MapPin size={14} />
        {PLACES[trip.places[0]].name}
        <ArrowRight size={13} />
        {PLACES[trip.places[1]].name}
        <span>몽골 현지 시각 기준</span>
      </div>
      <section
        id="day-panel"
        role={view === "currency" ? undefined : "tabpanel"}
        aria-labelledby={view === "currency" ? undefined : `tab-${date}`}
        className="day-panel"
      >
        {view === "currency" ? (
          <CurrencyConverter />
        ) : view === "map" ? (
          <DayMap date={date} />
        ) : (
          trip.places.map((key, index) => {
            const p = PLACES[key];
            const place = day?.places.find((p) => p.place === key);
            const s = place?.summary;
            const n = place?.night;
            return (
              <article
                key={`${date}-${key}`}
                className="place-card"
                style={{ "--place": p.color } as React.CSSProperties}
              >
                <div className="place-heading">
                  <div>
                    <div className="place-title">
                      <span className="place-number">0{index + 1}</span>
                      <h2>{p.name}</h2>
                      {trip.stay === key && <span className="stay">숙박</span>}
                    </div>
                    <p>{p.includes}</p>
                  </div>
                  {s && <WeatherIcon code={s.code} size={34} />}
                </div>
                {s ? (
                  <>
                    <div className="summary">
                      <div className="range">
                        <span>{Math.round(s.min)}°</span>
                        <span className="range-separator">/</span>
                        <strong>{Math.round(s.max)}°</strong>
                        <small>최저 · 최고</small>
                      </div>
                      <div className="summary-stats">
                        <span>
                          <Droplets size={14} />
                          강수{" "}
                          {s.precipProbMax === null
                            ? "—"
                            : `${Math.round(s.precipProbMax)}%`}
                        </span>
                        <span>
                          <Wind size={14} />
                          돌풍 {s.gustMax.toFixed(1)} m/s
                        </span>
                      </div>
                    </div>
                    <div className="sun-times">
                      <span>
                        <Sunrise size={14} />
                        {s.sunrise.slice(11, 16) || "—"}
                      </span>
                      <span>
                        <Sunset size={14} />
                        {s.sunset.slice(11, 16) || "—"}
                      </span>
                      {warnings(s).map((w) => (
                        <span key={w} className="warning">
                          {w}
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="empty">
                    {loading && !data
                      ? "시간별 예보를 불러오고 있어요…"
                      : error && !data
                        ? "연결 확인 후 새로고침해 주세요."
                        : "아직 예보 범위 밖"}
                    <small>이 장소의 0–23시 예보가 준비되면 표시됩니다.</small>
                  </div>
                )}
                {place && s && now && (
                  <HourlyChart
                    data={place}
                    domain={domain}
                    date={date}
                    now={now}
                  />
                )}
                {n && (
                  <div className="night-summary">
                    <div className="night-title">
                      <Stars size={15} />
                      <strong>오늘의 밤하늘</strong>
                      <span className="star-verdict">{starVerdict(n)}</span>
                    </div>
                    <div className="night-values">
                      <span>
                        {moonIcons[Math.round(n.moonPhase * 8) % 8]} 달 밝기{" "}
                        <b>{Math.round(n.moonIllumination)}%</b>
                      </span>
                      <span>
                        구름{" "}
                        <b>
                          {n.cloudAvg === null
                            ? "—"
                            : `${Math.round(n.cloudAvg)}%`}
                        </b>{" "}
                        <small>21–24시</small>
                      </span>
                      <span>
                        월출{" "}
                        {n.moonrise ? localTime(new Date(n.moonrise)) : "없음"}{" "}
                        · 월몰{" "}
                        {n.moonset ? localTime(new Date(n.moonset)) : "없음"}
                      </span>
                    </div>
                  </div>
                )}
              </article>
            );
          })
        )}
      </section>
      <footer>
        <span className="footer-brand">부엉부엉🦉몽골여행</span>
        <p>
          날씨 데이터{" "}
          <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
            Open-Meteo
          </a>{" "}
          · 달 계산 SunCalc
        </p>
        <p>
          현재 날씨는 관측값이 아닌 모델 추정값입니다.
          <br />
          모든 시각은 몽골 현지 기준이며, 장소 좌표는 대략값입니다.
        </p>
      </footer>
    </main>
  );
}
