import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import maps from "../src/generated/day-maps.json";
import { DayMap } from "../src/components/day-map";
import { DAY_STOPS, POIS, poiUrl, directionsUrl } from "../src/config/pois";
import { PLACES } from "../src/config/trip";
import {
  projection,
  simplify,
  pathData,
  scaleBar,
} from "../scripts/map-geometry";
import type { DayMapData } from "../src/lib/map-types";
test("신공항 및 확정 캠프 좌표, 경유지 순서가 링크에 반영된다", () => {
  assert.equal(POIS.airport.lat, 47.65139);
  assert.equal(POIS.airport.lon, 106.82139);
  assert.deepEqual([PLACES.desert.lat, PLACES.desert.lon], [47.3656, 103.8152]);
  assert.deepEqual([PLACES.terelj.lat, PLACES.terelj.lon], [47.8636, 107.4203]);
  for (const [date, stops] of Object.entries(DAY_STOPS)) {
    const params = new URL(directionsUrl(date)).searchParams;
    const coordinate = (id: (typeof stops)[number]) =>
      `${POIS[id].lat},${POIS[id].lon}`;
    assert.equal(params.get("origin"), coordinate(stops[0]));
    assert.equal(params.get("destination"), coordinate(stops.at(-1)!));
    assert.equal(
      params.get("waypoints"),
      stops.length > 2 ? stops.slice(1, -1).map(coordinate).join("|") : null,
    );
    assert.ok(stops.length - 2 <= 3);
  }
  const expectedLinks = {
    airport: "https://maps.app.goo.gl/aHkh83MvZzo2VRQPA",
    bichigt: "https://maps.app.goo.gl/trwb31zEEujFYrab7",
    turtle: "https://maps.app.goo.gl/5EtCEa2FAGhKrz267",
    aryapala: "https://maps.app.goo.gl/pyn9LxpLGYeQemdz9",
    grace: "https://maps.app.goo.gl/pbcrcqKuWWUYH5MW6",
    statue: "https://maps.app.goo.gl/bxREgo9BHgyE4DzY8",
    square: "https://maps.app.goo.gl/CdRdtUd9Bu29Rf8B6",
    dept: "https://maps.app.goo.gl/rMua1SuXT6PyJ6UD9",
  } as const;
  for (const poi of Object.values(POIS)) {
    assert.equal(poiUrl(poi.id), expectedLinks[poi.id]);
    assert.equal(poiUrl(poi.id), poi.googleUrl);
    assert.equal(new URL(poiUrl(poi.id)).hostname, "maps.app.goo.gl");
  }
});
test("날짜별 방문점은 빠짐없이 한 번씩, 확대 박스는 올바른 날짜에 생성", () => {
  assert.deepEqual(
    maps.map((m) => m.insets.length),
    [0, 1, 1],
  );
  for (const map of maps as DayMapData[]) {
    const layers = [map.main, ...map.insets];
    const ids = layers.flatMap((l) =>
      l.points.filter((p) => p.poi).map((p) => p.poi!),
    );
    assert.deepEqual(ids.sort(), [...DAY_STOPS[map.date]].sort());
    for (const layer of layers) {
      assert.ok(layer.scale.px > 0 && Number.isFinite(layer.scale.px));
      for (const leg of layer.legs) {
        assert.ok(/^M/.test(leg.d));
        assert.ok(!/NaN|Infinity/.test(leg.d));
      }
      for (const point of layer.points) {
        assert.ok(point.x >= 0 && point.y >= 0);
        assert.ok(point.order.length > 0);
      }
    }
  }
});
test("지도는 서버 렌더에서 즉시 표시되고 SVG 링크 Tab 순서와 터치 영역을 보장", () => {
  for (const map of maps) {
    const html = renderToStaticMarkup(
      createElement(DayMap, { date: map.date }),
    );
    assert.ok(html.includes('viewBox="0 0 360 240"'));
    assert.ok(!/<(?:iframe|img|script)\b/.test(html));
    const svg = html.slice(html.indexOf("<svg"), html.indexOf("</svg>"));
    const orders = [...svg.matchAll(/aria-label="(\d)번/g)].map((m) =>
      Number(m[1]),
    );
    assert.deepEqual(
      orders,
      DAY_STOPS[map.date].map((_, i) => i + 1),
    );
    for (const link of svg.matchAll(/<a\s([^>]+)>/g)) {
      assert.ok(link[1].includes('target="_blank"'));
      assert.ok(link[1].includes('rel="noopener noreferrer"'));
    }
    assert.ok(svg.includes('r="25"'));
    assert.ok((50 * (360 - 32 - 2)) / 360 >= 44);
  }
});
test("위도 보정 투영·단순화·축척은 지리 비율과 경로 끝점을 보존", () => {
  const p = projection(
    [
      [106, 47],
      [107, 48],
    ],
    { x: 24, y: 24, w: 312, h: 192 },
  );
  const a = p.point([106, 47]),
    b = p.point([107, 48]);
  assert.ok(b[0] > a[0] && b[1] < a[1]);
  assert.ok(
    Math.abs((b[0] - a[0]) / (a[1] - b[1]) - Math.cos((47.5 * Math.PI) / 180)) <
      1e-8,
  );
  const points: [number, number][] = [
    [0, 0],
    [1, 0.1],
    [2, 0],
    [3, 2],
  ];
  assert.deepEqual(simplify(points), [
    [0, 0],
    [2, 0],
    [3, 2],
  ]);
  assert.equal(
    pathData([
      [0, 0],
      [1.234, 5.678],
    ]),
    "M0,0L1.2,5.7",
  );
  assert.deepEqual(scaleBar(2, 360), { px: 100, km: 50 });
});
test("지도 JSON 12KB 제한 및 경로가 없는 구간은 점선 속성 사용", () => {
  assert.ok(
    readFileSync("src/generated/day-maps.json").byteLength <= 12 * 1024,
  );
  const day = (maps as DayMapData[]).find(
    (m) =>
      m.main.legs.some((l) => l.dashed) ||
      m.insets.some((i) => i.legs.some((l) => l.dashed)),
  );
  assert.ok(day);
  const html = renderToStaticMarkup(createElement(DayMap, { date: day.date }));
  assert.ok(html.includes('stroke-dasharray="5 5"'));
});
