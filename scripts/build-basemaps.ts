// Run only when updating the bundled maps; visitors make no map API requests.
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";
const views = {
  overview: [105.55, 47.75, 580000],
  desert: [103.75, 47.35, 30000],
  terelj: [107.44, 47.88, 38000],
  city: [106.91, 47.917, 5000],
  lastday: [107.15, 47.79, 100000],
};
const project = (lon: number, lat: number) => [
  (lon * 20037508.34) / 180,
  Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) * 6378137,
];
async function main() {
  await mkdir("public/maps", { recursive: true });
  const result: Record<string, { bounds: number[]; bytes: number }> = {};
  for (const [id, [lon, lat, width]] of Object.entries(views)) {
    const [x, y] = project(lon, lat);
    const height = (width * 2) / 3;
    const bounds = [
      x - width / 2,
      y - height / 2,
      x + width / 2,
      y + height / 2,
    ];
    const params = new URLSearchParams({
      bbox: bounds.join(","),
      bboxSR: "3857",
      imageSR: "3857",
      size: "900,600",
      format: "png32",
      f: "image",
    });
    const response = await fetch(
      `https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/export?${params}`,
      { signal: AbortSignal.timeout(60000) },
    );
    if (!response.ok) throw new Error(`${id}: ${response.status}`);
    const data = await sharp(Buffer.from(await response.arrayBuffer()))
      .webp({ quality: 72 })
      .toBuffer();
    await writeFile(`public/maps/${id}.webp`, data);
    result[id] = { bounds, bytes: data.length };
    console.log(id, data.length);
  }
  await writeFile("src/generated/basemaps.json", JSON.stringify(result));
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
