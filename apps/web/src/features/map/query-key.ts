import type { ViewportBounds } from "../api/types";

function round(value: number, precision = 2) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

export function zoomBucket(zoom: number) {
  if (zoom < 5) return 4;
  if (zoom < 7) return 6;
  if (zoom < 10) return 8;
  return 10;
}

export function bboxParam(bounds: ViewportBounds) {
  return [
    round(bounds.west),
    round(bounds.south),
    round(bounds.east),
    round(bounds.north),
  ].join(",");
}

export function buildSearchParams(bounds: ViewportBounds) {
  const params = new URLSearchParams();
  params.set("bbox", bboxParam(bounds));
  params.set("zBucket", String(zoomBucket(bounds.zoom)));
  return params.toString();
}
