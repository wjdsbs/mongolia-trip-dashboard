export type XY = [number, number];
export type Rect = { x: number; y: number; w: number; h: number };
export function projection(coords: XY[], box: Rect) {
  const minLat = Math.min(...coords.map((c) => c[1]));
  const maxLat = Math.max(...coords.map((c) => c[1]));
  const lon0 = Math.min(...coords.map((c) => c[0]));
  const cos = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
  const raw = (p: XY): XY => [(p[0] - lon0) * cos, maxLat - p[1]];
  const extent = coords.map(raw);
  const maxX = Math.max(...extent.map((c) => c[0]));
  const maxY = Math.max(...extent.map((c) => c[1]));
  const k = Math.min(
    box.w / Math.max(maxX, 1e-9),
    box.h / Math.max(maxY, 1e-9),
  );
  const dx = box.x + (box.w - maxX * k) / 2;
  const dy = box.y + (box.h - maxY * k) / 2;
  return {
    point: (p: XY): XY => {
      const [x, y] = raw(p);
      return [x * k + dx, y * k + dy];
    },
    pxPerKm: k / 111.195,
  };
}
function segmentDistance(p: XY, a: XY, b: XY) {
  const dx = b[0] - a[0],
    dy = b[1] - a[1];
  const t =
    dx || dy
      ? Math.max(
          0,
          Math.min(
            1,
            ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy),
          ),
        )
      : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}
export function simplify(points: XY[], epsilon = 0.7): XY[] {
  if (points.length <= 2) return points;
  const keep = new Set([0, points.length - 1]);
  const pending: [[number, number]] | [number, number][] = [
    [0, points.length - 1],
  ];
  while (pending.length) {
    const [start, end] = pending.pop()!;
    let max = epsilon,
      index = -1;
    for (let i = start + 1; i < end; i++) {
      const distance = segmentDistance(points[i], points[start], points[end]);
      if (distance > max) {
        max = distance;
        index = i;
      }
    }
    if (index !== -1) {
      keep.add(index);
      pending.push([start, index], [index, end]);
    }
  }
  return [...keep].sort((a, b) => a - b).map((i) => points[i]);
}
export const round = (n: number) => Math.round(n * 10) / 10;
export const pathData = (points: XY[]) =>
  simplify(points)
    .map(([x, y], i) => `${i ? "L" : "M"}${round(x)},${round(y)}`)
    .join("");
export function scaleBar(pxPerKm: number, width: number) {
  const options = [1, 2, 5, 10, 20, 50, 100];
  const km = options.reduce((best, n) =>
    Math.abs(n * pxPerKm - width * 0.25) <
    Math.abs(best * pxPerKm - width * 0.25)
      ? n
      : best,
  );
  return { px: round(km * pxPerKm), km };
}
