"use client";
import { useState } from "react";
import {
  localDate,
  localTime,
  weatherLabel,
  type DayPlace,
} from "@/lib/weather";
import { WeatherIcon } from "./weather-icon";
export function HourlyChart({
  data,
  domain,
  date,
  now,
}: {
  data: DayPlace;
  domain: [number, number];
  date: string;
  now: Date;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const hours = data.hours;
  const x = (hour: number) => 32 + (hour + 0.5) * 25;
  const y = (temp: number) =>
    162 - ((temp - domain[0]) / (domain[1] - domain[0])) * 104;
  const line = (field: "temp" | "feels") =>
    hours
      .map((h, i) => `${i ? "L" : "M"}${x(h.hour)},${y(h[field])}`)
      .join(" ");
  const active = selected === null ? null : hours[selected];
  const min = hours.reduce((a, b) => (a.temp <= b.temp ? a : b));
  const max = hours.reduce((a, b) => (a.temp >= b.temp ? a : b));
  const gustMax = Math.max(16, ...hours.map((h) => h.gust));
  const time = localTime(now).split(":").map(Number);
  const currentX = 32 + (time[0] + time[1] / 60) * 25;
  const isToday = localDate(now) === date;
  const sunHour = (value: string) => {
    const parts = value.slice(11, 16).split(":").map(Number);
    return parts[0] + parts[1] / 60;
  };
  const sunrise = data.summary?.sunrise ? sunHour(data.summary.sunrise) : null;
  const sunset = data.summary?.sunset ? sunHour(data.summary.sunset) : null;
  const pick = (e: React.PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    setSelected(
      Math.max(
        0,
        Math.min(
          23,
          Math.floor((((e.clientX - box.left) / box.width) * 640 - 32) / 25),
        ),
      ),
    );
  };
  return (
    <div className="chart-wrap">
      <div className="chart-legend">
        <span>
          <i />
          기온
        </span>
        <span>
          <i className="dashed" />
          체감
        </span>
        <span className="chart-hint">탭해서 시간별 보기</span>
      </div>
      <svg
        className="hourly-chart"
        viewBox="0 0 640 342"
        role="slider"
        tabIndex={0}
        aria-label="시간별 날씨. 좌우 방향키로 시간 선택"
        aria-valuemin={0}
        aria-valuemax={23}
        aria-valuenow={selected ?? 0}
        aria-valuetext={
          active
            ? `${active.hour}시, ${weatherLabel(active.code)}, 기온 ${active.temp}도, 체감 ${active.feels}도`
            : "시간 선택"
        }
        onKeyDown={(e) => {
          if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
            e.preventDefault();
            setSelected(
              e.key === "Home"
                ? 0
                : e.key === "End"
                  ? 23
                  : Math.max(
                      0,
                      Math.min(
                        23,
                        (selected ?? 0) + (e.key === "ArrowRight" ? 1 : -1),
                      ),
                    ),
            );
          }
        }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          pick(e);
        }}
        onPointerMove={(e) => {
          if (e.buttons) pick(e);
        }}
      >
        <title>24시간 날씨, 기온, 강수확률, 돌풍</title>
        {sunrise !== null && sunset !== null ? (
          <>
            <rect
              x={32}
              y={0}
              width={sunrise * 25}
              height={318}
              fill="var(--night)"
            />
            <rect
              x={32 + sunset * 25}
              y={0}
              width={(24 - sunset) * 25}
              height={318}
              fill="var(--night)"
            />
          </>
        ) : (
          hours
            .filter((h) => !h.isDay)
            .map((h) => (
              <rect
                key={h.hour}
                x={x(h.hour) - 12.5}
                y={0}
                width={25}
                height={318}
                fill="var(--night)"
              />
            ))
        )}
        {[0, 3, 6, 9, 12, 15, 18, 21].map((hour) => (
          <g key={hour}>
            <line
              x1={x(hour)}
              x2={x(hour)}
              y1={0}
              y2={318}
              stroke="var(--grid)"
            />
            <foreignObject x={x(hour) - 11} y={10} width={22} height={26}>
              <WeatherIcon
                code={hours[hour].code}
                isDay={hours[hour].isDay}
                size={21}
              />
            </foreignObject>
            <text x={x(hour)} y={337} textAnchor="middle" className="axis">
              {hour.toString().padStart(2, "0")}
            </text>
          </g>
        ))}
        <text x={3} y={51} className="axis">
          °C
        </text>
        <text x={3} y={76} className="axis">
          {domain[1]}
        </text>
        <text x={3} y={161} className="axis">
          {domain[0]}
        </text>
        <line
          x1={32}
          x2={632}
          y1={y(0)}
          y2={y(0)}
          stroke="var(--muted)"
          strokeDasharray="3 5"
          opacity=".45"
        />
        <text x={7} y={y(0) + 4} className="axis">
          0
        </text>
        <path
          d={line("feels")}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={2}
          strokeDasharray="5 5"
        />
        <path
          d={line("temp")}
          fill="none"
          stroke="var(--place)"
          strokeWidth={3}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {[min, max]
          .filter((h, i, a) => i === 0 || h.hour !== a[0].hour)
          .map((h) => (
            <g key={h.hour}>
              <circle cx={x(h.hour)} cy={y(h.temp)} r={4} fill="var(--place)" />
              <text
                x={x(h.hour)}
                y={y(h.temp) - 10}
                textAnchor="middle"
                className="temp-label"
              >
                {Math.round(h.temp)}°
              </text>
            </g>
          ))}
        <line x1={32} x2={632} y1={184} y2={184} stroke="var(--grid)" />
        <text x={32} y={201} className="row-label">
          강수확률 % · 강수량 mm
        </text>
        <text x={631} y={201} textAnchor="end" className="axis">
          100%
        </text>
        {hours.map((h) => (
          <g key={h.hour}>
            <rect
              x={x(h.hour) - 6}
              y={249 - (h.precipProb ?? 0) * 0.34}
              width={12}
              height={Math.max(1, (h.precipProb ?? 0) * 0.34)}
              rx={2}
              fill="var(--rain)"
            />
            {h.precip > 0 && (
              <text
                x={x(h.hour)}
                y={244 - (h.precipProb ?? 0) * 0.34}
                textAnchor="middle"
                className="mm-label"
              >
                {h.precip.toFixed(1)}
              </text>
            )}
            {h.precipProb === null && (
              <text x={x(h.hour)} y={244} textAnchor="middle" className="axis">
                –
              </text>
            )}
          </g>
        ))}
        <line x1={32} x2={632} y1={256} y2={256} stroke="var(--grid)" />
        <text x={32} y={274} className="row-label">
          돌풍 m/s
        </text>
        <text x={631} y={274} textAnchor="end" className="axis">
          강풍 ≥ 12
        </text>
        {hours.map((h) => (
          <rect
            key={h.hour}
            x={x(h.hour) - 6}
            y={316 - (h.gust / gustMax) * 34}
            width={12}
            height={Math.max(1, (h.gust / gustMax) * 34)}
            rx={2}
            fill={h.gust >= 12 ? "var(--warning)" : "var(--wind)"}
          />
        ))}
        {isToday && (
          <g>
            <line
              x1={currentX}
              x2={currentX}
              y1={0}
              y2={318}
              stroke="var(--text)"
              strokeDasharray="3 3"
            />
            <text x={Math.min(610, currentX + 5)} y={49} className="row-label">
              지금
            </text>
          </g>
        )}
        {selected !== null && (
          <line
            x1={x(selected)}
            x2={x(selected)}
            y1={0}
            y2={318}
            stroke="var(--place)"
            strokeWidth={2}
          />
        )}
      </svg>
      {active && (
        <div className="hour-detail" aria-live="polite">
          <strong>
            {String(active.hour).padStart(2, "0")}:00 ·{" "}
            {weatherLabel(active.code)}
          </strong>
          <button onClick={() => setSelected(null)} aria-label="시간 상세 닫기">
            ×
          </button>
          <div>
            <span>
              기온 <b>{active.temp}°</b>
            </span>
            <span>
              체감 <b>{active.feels}°</b>
            </span>
            <span>
              강수확률 <b>{active.precipProb ?? "–"}%</b>
            </span>
            <span>
              강수량 <b>{active.precip} mm</b>
            </span>
            <span>
              풍속 <b>{active.wind} m/s</b>
            </span>
            <span>
              돌풍 <b>{active.gust} m/s</b>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
