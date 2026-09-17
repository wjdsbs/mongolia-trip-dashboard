export type PlaceKey = "ub" | "desert" | "terelj";
export const TIMEZONE = "Asia/Ulaanbaatar";
export const PLACES: Record<
  PlaceKey,
  { name: string; includes: string; lat: number; lon: number; color: string }
> = {
  ub: {
    name: "울란바타르",
    includes: "수흐바타르 광장 · 칭기즈칸 국제공항",
    lat: 47.9186,
    lon: 106.9176,
    color: "var(--blue)",
  },
  desert: {
    name: "미니사막",
    includes: "엘승타사르해 · Bichigt Khad camp",
    lat: 47.3656,
    lon: 103.8152,
    color: "var(--sand)",
  },
  terelj: {
    name: "테를지",
    includes: "거북바위 · 칭기즈칸 기마상",
    lat: 47.8636,
    lon: 107.4203,
    color: "var(--green)",
  },
};
export const TRIP_DAYS: {
  date: string;
  places: PlaceKey[];
  stay?: PlaceKey;
}[] = [
  { date: "2026-09-23", places: ["ub", "desert"], stay: "desert" },
  { date: "2026-09-24", places: ["desert", "terelj"], stay: "terelj" },
  { date: "2026-09-25", places: ["terelj", "ub"] },
];
