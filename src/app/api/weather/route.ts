import { PLACES } from "@/config/trip";
import { normalizeForecast } from "@/lib/forecast";
export const revalidate = 900;
export async function GET() {
  try {
    const places = Object.values(PLACES);
    const query = new URLSearchParams({
      latitude: places.map((p) => p.lat).join(","),
      longitude: places.map((p) => p.lon).join(","),
      current: "temperature_2m,apparent_temperature,weather_code,is_day",
      hourly:
        "temperature_2m,apparent_temperature,precipitation_probability,precipitation,snowfall,weather_code,cloud_cover,wind_speed_10m,wind_gusts_10m,is_day",
      daily: "sunrise,sunset",
      timezone: "Asia/Ulaanbaatar",
      wind_speed_unit: "ms",
      past_days: "2",
      forecast_days: "16",
    });
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?${query}`,
      { next: { revalidate: 900 }, signal: AbortSignal.timeout(15000) },
    );
    if (!response.ok) throw new Error(`Weather upstream: ${response.status}`);
    return Response.json(normalizeForecast(await response.json()));
  } catch {
    return Response.json(
      { error: "날씨를 불러오지 못했어요. 잠시 후 다시 시도해 주세요." },
      { status: 502 },
    );
  }
}
