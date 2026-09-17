import maps from "@/generated/day-maps.json";
import { DAY_STOPS, POIS, poiUrl, directionsUrl } from "@/config/pois";
import { PLACES } from "@/config/trip";
import type { DayMapData, MapLayer, MapPoint } from "@/lib/map-types";
const numbers = ["①", "②", "③", "④", "⑤"];
function Marker({ point }: { point: MapPoint }) {
  const { x, y, labelPos, order } = point;
  const isCluster = !!point.cluster;
  const radius = isCluster ? 12 : 10;
  const dx = labelPos === "r" ? 17 : labelPos === "l" ? -17 : 0;
  const dy = labelPos === "t" ? -19 : labelPos === "b" ? 25 : 4;
  const color = point.poi
    ? PLACES[POIS[point.poi].weatherPlace].color
    : "var(--text)";
  const poi = point.poi ? POIS[point.poi] : null;
  const shape = (
    <>
      <circle className="map-hit" cx={x} cy={y} r={25} fill="transparent" />
      <circle className="map-dot" cx={x} cy={y} r={radius} fill={color} />
      <text
        className={`map-number${isCluster ? " cluster-number" : ""}`}
        x={x}
        y={y + 0.5}
      >
        {isCluster
          ? `${numbers[order[0] - 1]}–${numbers[order.at(-1)! - 1]}`
          : order.join(",")}
      </text>
      <text
        className="map-label"
        x={x + dx}
        y={y + dy}
        textAnchor={
          labelPos === "r" ? "start" : labelPos === "l" ? "end" : "middle"
        }
      >
        {point.poi ? POIS[point.poi].mapName : point.label}
      </text>
    </>
  );
  return poi ? (
    <a
      href={poiUrl(poi.id)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${order.join(", ")}번 ${poi.name} 구글 지도에서 열기`}
    >
      {shape}
    </a>
  ) : (
    <g aria-label={`${point.label} ${order.join(", ")}번 장소, 확대 박스 참조`}>
      {shape}
    </g>
  );
}
function Routes({ layer }: { layer: MapLayer }) {
  return (
    <g fill="none" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      {layer.legs.map((leg, i) => (
        <path
          key={i}
          d={leg.d}
          stroke={PLACES[leg.place].color}
          strokeDasharray={leg.dashed ? "5 5" : undefined}
        />
      ))}
    </g>
  );
}
function Scale({
  scale,
  x,
  y,
}: {
  scale: MapLayer["scale"];
  x: number;
  y: number;
}) {
  return (
    <g className="map-scale" transform={`translate(${x} ${y})`}>
      <path d={`M0,-4V0H${scale.px}V-4`} fill="none" stroke="currentColor" />
      <text x={scale.px / 2} y={-7} textAnchor="middle">
        {scale.km} km
      </text>
    </g>
  );
}
export function DayMap({ date }: { date: string }) {
  const map = (maps as DayMapData[]).find((m) => m.date === date);
  if (!map) return null;
  // Sort all point links together so keyboard traversal follows the itinerary,
  // even when the middle stops live inside an inset.
  const points = [
    ...map.main.points.map((point) => ({ point, x: 0, y: 0 })),
    ...map.insets.flatMap((inset) =>
      inset.points.map((point) => ({ point, x: inset.box.x, y: inset.box.y })),
    ),
  ].sort((a, b) => a.point.order[0] - b.point.order[0]);
  const fallback = [map.main, ...map.insets].some((layer) =>
    layer.legs.some((l) => l.dashed),
  );
  return (
    <section className="day-map" aria-label="오늘의 방문 장소와 경로">
      <ol className="map-stops">
        {DAY_STOPS[date].map((id, i) => {
          const poi = POIS[id];
          return (
            <li key={`${poi.id}-${i}`}>
              <a
                href={poiUrl(poi.id)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span aria-hidden="true">{numbers[i]}</span> {poi.name}
              </a>
              {i < DAY_STOPS[date].length - 1 && (
                <span className="stop-arrow" aria-hidden="true">
                  →
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <svg
        className="route-map"
        viewBox="0 0 360 240"
        width="360"
        height="240"
        role="group"
        aria-label={`${date} 이동 경로 지도`}
      >
        <title>{`${date} 방문 순서와 이동 경로`}</title>
        <Routes layer={map.main} />
        {map.insets.map((inset) => (
          <g key={inset.title}>
            <path
              className="map-connector"
              d={`M${inset.anchor[0]},${inset.anchor[1]}L${Math.max(inset.box.x, Math.min(inset.box.x + inset.box.w, inset.anchor[0]))},${Math.max(inset.box.y, Math.min(inset.box.y + inset.box.h, inset.anchor[1]))}`}
            />
            <g transform={`translate(${inset.box.x} ${inset.box.y})`}>
              <rect
                className="map-inset"
                width={inset.box.w}
                height={inset.box.h}
                rx={8}
              />
              <text className="map-inset-title" x={12} y={19}>
                {inset.title}
              </text>
              <Routes layer={inset} />
              <Scale
                scale={inset.scale}
                x={inset.box.w - inset.scale.px - 12}
                y={inset.box.h - 10}
              />
            </g>
          </g>
        ))}
        <Scale scale={map.main.scale} x={24} y={227} />
        <g className="map-north" transform="translate(337 30)">
          <path d="M0,12V-2M-3,2L0,-3L3,2" />
          <text x={0} y={-9} textAnchor="middle">
            N
          </text>
        </g>
        {points.map(({ point, x, y }) => (
          <g
            key={point.poi ?? point.cluster}
            transform={`translate(${x} ${y})`}
          >
            <Marker point={point} />
          </g>
        ))}
      </svg>
      <p className="map-link-note">
        장소를 누르면 Google 지도 앱(또는 웹)으로 이동해요.
      </p>
      <div className="map-caption">
        <p>
          경로는 대략적인 도로 기준이에요.
          {fallback && <span>점선은 도로 미확인 구간이에요.</span>}
        </p>
        <a
          className="map-directions"
          href={directionsUrl(date)}
          target="_blank"
          rel="noopener noreferrer"
        >
          이날 경로 구글 지도에서 열기 ↗
        </a>
      </div>
      <p className="map-credit">경로 OSRM · © OpenStreetMap contributors</p>
    </section>
  );
}
