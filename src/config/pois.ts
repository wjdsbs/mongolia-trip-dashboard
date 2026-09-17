import type { PlaceKey } from "./trip";
export type PoiId =
  | "airport"
  | "bichigt"
  | "turtle"
  | "aryapala"
  | "grace"
  | "statue"
  | "square"
  | "dept";
export type Poi = {
  id: PoiId;
  name: string;
  mapName: string;
  localName?: string;
  lat: number;
  lon: number;
  weatherPlace: PlaceKey;
  googleUrl: string;
};
export const POIS: Record<PoiId, Poi> = {
  airport: {
    id: "airport",
    name: "칭기즈칸 국제공항 (UBN)",
    mapName: "국제공항 (UBN)",
    localName: "Чингис хаан олон улсын нисэх буудал",
    lat: 47.65139,
    lon: 106.82139,
    weatherPlace: "ub",
    googleUrl: "https://maps.app.goo.gl/aHkh83MvZzo2VRQPA",
  },
  bichigt: {
    id: "bichigt",
    name: "Bichigt Khad camp",
    mapName: "Bichigt Khad camp",
    lat: 47.3656005,
    lon: 103.8152084,
    weatherPlace: "desert",
    googleUrl: "https://maps.app.goo.gl/trwb31zEEujFYrab7",
  },
  turtle: {
    id: "turtle",
    name: "거북바위",
    mapName: "거북바위",
    localName: "Мэлхий хад",
    lat: 47.907432,
    lon: 107.422884,
    weatherPlace: "terelj",
    googleUrl: "https://maps.app.goo.gl/5EtCEa2FAGhKrz267",
  },
  aryapala: {
    id: "aryapala",
    name: "아리야발 사원",
    mapName: "아리야발 사원",
    localName: "Аръяабалын хийд",
    lat: 47.935516,
    lon: 107.427422,
    weatherPlace: "terelj",
    googleUrl: "https://maps.app.goo.gl/pyn9LxpLGYeQemdz9",
  },
  grace: {
    id: "grace",
    name: "Grace camp",
    mapName: "Grace camp",
    lat: 47.8636374,
    lon: 107.4203322,
    weatherPlace: "terelj",
    googleUrl: "https://maps.app.goo.gl/pbcrcqKuWWUYH5MW6",
  },
  statue: {
    id: "statue",
    name: "칭기즈칸 기마상",
    mapName: "기마상",
    localName: "Цонжин болдог",
    lat: 47.8080556,
    lon: 107.52975,
    weatherPlace: "terelj",
    googleUrl: "https://maps.app.goo.gl/bxREgo9BHgyE4DzY8",
  },
  square: {
    id: "square",
    name: "수흐바타르 광장",
    mapName: "수흐바타르 광장",
    localName: "Сүхбаатарын талбай",
    lat: 47.91889,
    lon: 106.9175,
    weatherPlace: "ub",
    googleUrl: "https://maps.app.goo.gl/CdRdtUd9Bu29Rf8B6",
  },
  dept: {
    id: "dept",
    name: "국영 백화점",
    mapName: "국영 백화점",
    localName: "Улаанбаатар Их Дэлгүүр",
    lat: 47.915,
    lon: 106.9016,
    weatherPlace: "ub",
    googleUrl: "https://maps.app.goo.gl/rMua1SuXT6PyJ6UD9",
  },
};
export const DAY_STOPS: Record<string, PoiId[]> = {
  "2026-09-23": ["airport", "bichigt"],
  "2026-09-24": ["bichigt", "turtle", "aryapala", "grace"],
  "2026-09-25": ["grace", "statue", "square", "dept", "airport"],
};
export const poiUrl = (id: PoiId) => POIS[id].googleUrl;
export function directionsUrl(date: string) {
  const stops = DAY_STOPS[date];
  if (!stops) throw new Error("Unknown trip date");
  const coord = (id: PoiId) => `${POIS[id].lat},${POIS[id].lon}`;
  const params = new URLSearchParams({
    api: "1",
    origin: coord(stops[0]),
    destination: coord(stops.at(-1)!),
    travelmode: "driving",
  });
  if (stops.length > 2)
    params.set("waypoints", stops.slice(1, -1).map(coord).join("|"));
  return `https://www.google.com/maps/dir/?${params}`;
}
