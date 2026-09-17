import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { DAY_STOPS, POIS, type PoiId } from "../src/config/pois";
import { MAP_LAYOUT, type MapRect } from "../src/config/map-layout";
import type { DayMapData, MapLayer, MapPoint } from "../src/lib/map-types";
import { projection, pathData, round, scaleBar, type XY } from "./map-geometry";
type Route = {
  code: string;
  routes?: { geometry: { coordinates: XY[] }; distance: number }[];
};
type Leg = { from: PoiId; to: PoiId; coords: XY[] | null };
const root = process.cwd();
const cacheDir = resolve(root, "scripts/cache");
const previewDir = resolve(root, "scripts/preview");
const offline = process.argv.includes("--offline");
const retryFailed = process.argv.includes("--retry-failed");
const coord = (id: PoiId): XY => [POIS[id].lon, POIS[id].lat];
let lastRequest = 0;
async function route(from: PoiId, to: PoiId): Promise<XY[] | null> {
  const file = resolve(cacheDir, `${from}-${to}.json`);
  const signature = `${coord(from)};${coord(to)}`;
  try {
    const cached = JSON.parse(await readFile(file, "utf8"));
    if (cached.signature === signature && (!retryFailed || cached.response)) {
      return cached.response?.routes?.[0]?.geometry?.coordinates ?? null;
    }
  } catch {}
  if (offline) return null;
  await new Promise((done) =>
    setTimeout(done, Math.max(0, 1000 - (Date.now() - lastRequest))),
  );
  lastRequest = Date.now();
  let response: Route | null = null;
  let error: string | undefined;
  try {
    const result = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${signature}?overview=full&geometries=geojson`,
      { signal: AbortSignal.timeout(20000) },
    );
    if (!result.ok) throw new Error(`HTTP ${result.status}`);
    const raw = (await result.json()) as Route;
    const coordinates = raw.routes?.[0]?.geometry?.coordinates;
    if (
      raw.code !== "Ok" ||
      !coordinates ||
      coordinates.length < 2 ||
      !coordinates.every((p) => p.length >= 2 && p.every(Number.isFinite))
    )
      throw new Error(raw.code ?? "Invalid route");
    response = raw;
  } catch (e) {
    error = String(e);
  }
  await writeFile(
    file,
    JSON.stringify({
      signature,
      source: "OSRM / OpenStreetMap",
      fetchedAt: new Date().toISOString(),
      response,
      error,
    }),
  );
  console.log(
    `${from} → ${to}: ${response ? "road route" : "dashed fallback"}`,
  );
  return response?.routes?.[0]?.geometry.coordinates ?? null;
}
function layer(
  stops: PoiId[],
  allStops: PoiId[],
  legs: Leg[],
  box: MapRect,
  date: string,
  clustered: boolean,
  scaleWidth = 360,
): MapLayer {
  const config = MAP_LAYOUT[date];
  const groups = clustered ? (config.clusters ?? []) : [];
  const groupFor = (id: PoiId) => groups.find((c) => c.members.includes(id));
  const groupCenter = (id: PoiId): XY => {
    const group = groupFor(id);
    return group
      ? [
          group.members.reduce((n, id) => n + POIS[id].lon, 0) /
            group.members.length,
          group.members.reduce((n, id) => n + POIS[id].lat, 0) /
            group.members.length,
        ]
      : coord(id);
  };
  const visibleLegs = legs.filter(
    (l) => !(groupFor(l.from) && groupFor(l.from) === groupFor(l.to)),
  );
  const routes = visibleLegs.map((l) => ({
    leg: l,
    points: l.coords ?? [coord(l.from), coord(l.to)],
  }));
  const p = projection(
    [...stops.map(groupCenter), ...routes.flatMap((r) => r.points)],
    box,
  );
  const seen = new Set<string>();
  const points: MapPoint[] = [];
  for (const id of stops) {
    const group = groupFor(id);
    const key = group?.id ?? id;
    if (seen.has(key)) continue;
    seen.add(key);
    const [x, y] = p.point(groupCenter(id));
    points.push({
      ...(group ? { cluster: group.id } : { poi: id }),
      order: allStops.flatMap((v, i) =>
        (group ? group.members.includes(v) : v === id) ? [i + 1] : [],
      ),
      x: round(x),
      y: round(y),
      label: group?.label ?? POIS[id].mapName,
      labelPos: config.labels?.[key] ?? "b",
    });
  }
  const drawn = routes.flatMap(({ leg, points }) => {
    const main = {
      d: pathData(points.map(p.point)),
      place: POIS[leg.from].weatherPlace,
      dashed: !leg.coords,
    };
    // OSRM snaps to roads. Keep off-road approaches honest with dashed connectors.
    const connectors = leg.coords
      ? [
          [groupCenter(leg.from), points[0]],
          [points.at(-1)!, groupCenter(leg.to)],
        ].flatMap((pair) => {
          const a = p.point(pair[0]),
            b = p.point(pair[1]);
          return Math.hypot(a[0] - b[0], a[1] - b[1]) > 1
            ? [
                {
                  d: pathData([a, b]),
                  place: POIS[leg.from].weatherPlace,
                  dashed: true,
                },
              ]
            : [];
        })
      : [];
    return [main, ...connectors];
  });
  return { legs: drawn, points, scale: scaleBar(p.pxPerKm, scaleWidth) };
}
async function main() {
  await mkdir(cacheDir, { recursive: true });
  await mkdir(previewDir, { recursive: true });
  await mkdir(resolve(root, "src/generated"), { recursive: true });
  const maps: DayMapData[] = [];
  for (const [date, stops] of Object.entries(DAY_STOPS)) {
    const config = MAP_LAYOUT[date];
    const legs: Leg[] = [];
    for (let i = 1; i < stops.length; i++) {
      const from = stops[i - 1],
        to = stops[i];
      const straight = config.straightLegs?.some(
        (pair) => pair[0] === from && pair[1] === to,
      );
      legs.push({ from, to, coords: straight ? null : await route(from, to) });
    }
    const main = layer(stops, stops, legs, config.mainBounds, date, true);
    const insets = (config.clusters ?? []).map((cluster) => {
      const { w, h, corner } = cluster.inset;
      const box = {
        x: corner.endsWith("l") ? 8 : 352 - w,
        y: corner.startsWith("t") ? 8 : 232 - h,
        w,
        h,
      };
      const anchor = main.points.find((p) => p.cluster === cluster.id)!;
      return {
        ...layer(
          cluster.members,
          stops,
          legs.filter(
            (l) =>
              cluster.members.includes(l.from) &&
              cluster.members.includes(l.to),
          ),
          cluster.plot ?? { x: 24, y: 36, w: w - 48, h: h - 68 },
          date,
          false,
          w,
        ),
        box,
        title: cluster.label,
        anchor: [anchor.x, anchor.y] as XY,
      };
    });
    maps.push({ date, viewBox: [360, 240], main, insets });
  }
  const json = JSON.stringify(maps);
  if (Buffer.byteLength(json) > 12288)
    throw new Error(`Map data exceeds 12KB: ${Buffer.byteLength(json)}`);
  await writeFile(resolve(root, "src/generated/day-maps.json"), json + "\n");
  // Render the real component, so preview labels, links, and CSS match the app.
  const { DayMap } = await import("../src/components/day-map");
  const css = await readFile(resolve(root, "src/app/globals.css"), "utf8");
  for (const map of maps) {
    const html = renderToStaticMarkup(
      createElement(DayMap, { date: map.date }),
    );
    await writeFile(
      resolve(previewDir, `${map.date}.html`),
      `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${map.date} 경로 미리보기</title><style>${css}\nbody{margin:0}main{width:360px;max-width:100%;padding:16px}</style><main>${html}</main></html>`,
    );
  }
  console.log(
    `Generated ${maps.length} maps (${Buffer.byteLength(json)} bytes) and matching HTML previews.`,
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
