import {
  Sun,
  Moon,
  CloudSun,
  Cloud,
  CloudFog,
  CloudLightning,
  CloudSnow,
  CloudRain,
} from "lucide-react";
import { weatherKind, weatherLabel } from "@/lib/weather";
export function WeatherIcon({
  code,
  isDay = true,
  size = 24,
}: {
  code: number;
  isDay?: boolean;
  size?: number;
}) {
  const Icon = {
    sun: Sun,
    moon: Moon,
    partly: CloudSun,
    cloud: Cloud,
    fog: CloudFog,
    storm: CloudLightning,
    snow: CloudSnow,
    rain: CloudRain,
  }[weatherKind(code, isDay)];
  return (
    <Icon
      size={size}
      strokeWidth={1.6}
      aria-label={weatherLabel(code)}
      className={`weather-icon ${weatherKind(code, isDay)}`}
    />
  );
}
