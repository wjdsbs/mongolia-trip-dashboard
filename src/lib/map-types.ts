import type { PlaceKey } from "@/config/trip";
import type { PoiId } from "@/config/pois";
import type { LabelPos, MapRect } from "@/config/map-layout";
export type MapPoint = {
  poi?: PoiId;
  cluster?: string;
  order: number[];
  x: number;
  y: number;
  label: string;
  labelPos: LabelPos;
};
export type MapLayer = {
  legs: { d: string; place: PlaceKey; dashed: boolean }[];
  points: MapPoint[];
  scale: { px: number; km: number };
};
export type DayMapData = {
  date: string;
  viewBox: [number, number];
  main: MapLayer;
  insets: (MapLayer & {
    box: MapRect;
    title: string;
    anchor: [number, number];
  })[];
};
