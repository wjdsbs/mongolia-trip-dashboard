"use client";
import { useState } from "react";
import basemaps from "@/generated/basemaps.json";
import routes from "@/generated/map-routes.json";
import {
  DAY_STOPS,
  POIS,
  poiUrl,
  directionsUrl,
  type PoiId,
} from "@/config/pois";
type View = keyof typeof basemaps;
const names: Record<View, string> = {
  overview: "전체 동선",
  desert: "미니사막·숙소 확대",
  terelj: "테를지 확대",
  city: "시내 확대",
  lastday: "전체 동선",
};
export function mapPoint(lon: number, lat: number, bounds: number[]) {
  const x = (lon * 20037508.34) / 180;
  const y = Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) * 6378137;
  return [
    ((x - bounds[0]) / (bounds[2] - bounds[0])) * 360,
    ((bounds[3] - y) / (bounds[3] - bounds[1])) * 240,
  ];
}
export function DayMap({ date }: { date: string }) {
  return <MapContent key={date} date={date} />;
}
function MapContent({ date }: { date: string }) {
  const choices: View[] =
    date === "2026-09-23"
      ? ["overview", "desert"]
      : date === "2026-09-24"
        ? ["overview", "terelj"]
        : ["lastday", "terelj", "city"];
  const [view, setView] = useState<View>(choices[0]);
  const [selected, setSelected] = useState<PoiId | null>(null);
  const stops = DAY_STOPS[date];
  if (!stops) return null;
  const bounds = basemaps[view].bounds;
  const scaleKm =
    view === "overview"
      ? 50
      : view === "lastday"
        ? 10
        : view === "city"
          ? 0.5
          : 5;
  const scalePx =
    ((scaleKm * 1000) /
      Math.cos((47.8 * Math.PI) / 180) /
      (bounds[2] - bounds[0])) *
    360;
  const project = (coord: number[]) => mapPoint(coord[0], coord[1], bounds);
  const point = (id: PoiId) => project([POIS[id].lon, POIS[id].lat]);
  const legs =
    (
      routes as Record<
        string,
        { from: PoiId; to: PoiId; coords: number[][]; dashed: boolean }[]
      >
    )[date] ?? [];
  function focus(id: PoiId) {
    setSelected(id);
    setView(
      id === "elsen" || id === "bichigt"
        ? date === "2026-09-23"
          ? "desert"
          : "overview"
        : ["turtle", "aryapala", "grace", "statue"].includes(id)
          ? "terelj"
          : ["square", "dept"].includes(id)
            ? "city"
            : choices[0],
    );
  }
  return (
    <section className="day-map" aria-label="오늘의 방문 장소와 경로">
      <div className="map-toolbar">
        {choices.map((id) => (
          <button
            type="button"
            key={id}
            aria-pressed={view === id}
            onClick={() => {
              setView(id);
              setSelected(null);
            }}
          >
            {names[id]}
          </button>
        ))}
      </div>
      <svg
        className="route-map geographic-map"
        viewBox="0 0 360 240"
        width="360"
        height="240"
        role="group"
        aria-label={`${date} 실제 지형 위 방문 경로`}
      >
        <title>{`${names[view]} · 북쪽이 위`}</title>
        <image
          href={`/maps/${view}.webp?v=${basemaps[view].bytes}`}
          width="360"
          height="240"
        />
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          {legs.map((leg, i) => {
            const d = leg.coords
              .map(
                (coord, j) =>
                  `${j ? "L" : "M"}${project(coord)
                    .map((n) => n.toFixed(2))
                    .join(",")}`,
              )
              .join("");
            return (
              <g key={i}>
                <path d={d} stroke="white" strokeWidth={5} />
                <path
                  d={d}
                  stroke="#b45328"
                  strokeWidth={2.5}
                  strokeDasharray={leg.dashed ? "5 5" : undefined}
                />
              </g>
            );
          })}
        </g>
        {stops.map((id, i) => {
          const [x, y] = point(id);
          if (x < 0 || x > 360 || y < 0 || y > 240) return null;
          const near =
            view === "overview" || view === "lastday"
              ? stops.filter((other) => {
                  const p = point(other);
                  return Math.hypot(p[0] - x, p[1] - y) < 23;
                })
              : [id];
          if (near[0] !== id) return null;
          const label =
            near.length > 1
              ? near.map((other) => stops.indexOf(other) + 1).join("·")
              : String(i + 1);
          return (
            <g
              key={id}
              role="button"
              tabIndex={0}
              aria-label={`${i + 1}번 ${POIS[id].name}${near.length > 1 ? " 주변 장소 확대" : " 선택"}`}
              onClick={() => focus(id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  focus(id);
                }
              }}
              className="geo-marker"
            >
              <circle
                className="map-hit"
                cx={x}
                cy={y}
                r={25}
                fill="transparent"
              />
              <circle
                cx={x}
                cy={y}
                r={near.length > 1 ? 14 : 11}
                fill={selected === id ? "#203e34" : "#b45328"}
                stroke="white"
                strokeWidth={2}
              />
              <text className="map-number" x={x} y={y + 0.5}>
                {label}
              </text>
              <text
                className="geo-label"
                x={Math.max(60, Math.min(300, x))}
                y={
                  y < 32 || (view === "terelj" && id === "turtle")
                    ? y + 28
                    : y - 18
                }
                textAnchor="middle"
              >
                {near.length > 1
                  ? id === "elsen"
                    ? "미니사막·숙소"
                    : id === "square"
                      ? "울란바타르 시내"
                      : "테를지"
                  : POIS[id].mapName}
              </text>
            </g>
          );
        })}
        <g transform="translate(342 20)">
          <rect x="-10" y="-13" width="20" height="32" rx="5" fill="white" />
          <text textAnchor="middle" fill="#203e34" fontSize="10">
            N
          </text>
          <path d="M0,14V4M-3,7L0,3L3,7" stroke="#203e34" fill="none" />
        </g>
        <g transform="translate(12 228)">
          <rect
            x="-5"
            y="-20"
            width={scalePx + 10}
            height="26"
            rx="4"
            fill="white"
            fillOpacity="0.9"
          />
          <path d={`M0,-4V0H${scalePx}V-4`} stroke="#203e34" fill="none" />
          <text
            x={scalePx / 2}
            y="-8"
            textAnchor="middle"
            fontSize="9"
            fill="#203e34"
          >
            {scaleKm} km
          </text>
        </g>
      </svg>
      <p className="map-link-note">
        번호나 아래 장소를 누르면 자세히 볼 수 있어요.
      </p>
      <ol className="itinerary-stops">
        {stops.map((id, i) => (
          <li key={id} className={selected === id ? "selected" : ""}>
            <button
              type="button"
              onClick={() => focus(id)}
              aria-pressed={selected === id}
            >
              <span className="stop-number">{i + 1}</span>
              <span>
                <strong>{POIS[id].name}</strong>
                <small>
                  {id === "bichigt" || id === "grace"
                    ? "숙소"
                    : id === "elsen"
                      ? "모래사막 · 대표 위치"
                      : id === "airport"
                        ? "공항"
                        : "관광지"}
                </small>
              </span>
            </button>
            <a
              href={poiUrl(id)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${POIS[id].name} Google 지도 열기`}
            >
              지도 ↗
            </a>
          </li>
        ))}
      </ol>
      <div className="map-caption">
        <p>실선: 도로 경로 · 점선: 도로 미확인 구간</p>
        <a
          className="map-directions"
          href={directionsUrl(date)}
          target="_blank"
          rel="noopener noreferrer"
        >
          이날 경로 Google 지도에서 열기 ↗
        </a>
      </div>
      <p className="map-credit">
        저용량 저장 지도 · 배경 Esri, USGS, NOAA, GIS User Community · 경로 OSRM
        / © OpenStreetMap contributors
      </p>
    </section>
  );
}
