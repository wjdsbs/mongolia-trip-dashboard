import type { PoiId } from "./pois";
export type LabelPos = "t" | "r" | "b" | "l";
export type MapRect = { x: number; y: number; w: number; h: number };
export type MapLayout = {
  mainBounds: MapRect;
  clusters?: {
    id: string;
    label: string;
    members: PoiId[];
    inset: { corner: "tl" | "tr" | "bl" | "br"; w: number; h: number };
    plot?: MapRect;
  }[];
  labels?: Partial<Record<PoiId | string, LabelPos>>;
  straightLegs?: [PoiId, PoiId][];
};
export const MAP_LAYOUT: Record<string, MapLayout> = {
  "2026-09-23": {
    mainBounds: { x: 36, y: 52, w: 288, h: 132 },
    labels: { airport: "l", bichigt: "r" },
  },
  "2026-09-24": {
    mainBounds: { x: 36, y: 186, w: 288, h: 26 },
    clusters: [
      {
        id: "terelj",
        label: "테를지",
        members: ["turtle", "aryapala", "grace"],
        inset: { corner: "tl", w: 176, h: 176 },
        plot: { x: 28, y: 35, w: 20, h: 114 },
      },
    ],
    labels: {
      bichigt: "r",
      terelj: "t",
      turtle: "r",
      aryapala: "r",
      grace: "r",
    },
  },
  "2026-09-25": {
    mainBounds: { x: 34, y: 28, w: 276, h: 138 },
    clusters: [
      {
        id: "city",
        label: "울란바타르 시내",
        members: ["square", "dept"],
        inset: { corner: "br", w: 176, h: 112 },
        plot: { x: 29, y: 45, w: 112, h: 34 },
      },
    ],
    labels: {
      grace: "t",
      statue: "b",
      airport: "t",
      city: "b",
      square: "b",
      dept: "t",
    },
  },
};
