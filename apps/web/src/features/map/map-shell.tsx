"use client";

import maplibregl, { LngLatBoundsLike, Map } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";

import type { HeatCell, ViewportBounds } from "../api/types";

type MapShellProps = {
  cells: HeatCell[];
  selectedCellId?: string;
  focusTarget?: { lng: number; lat: number; zoom: number; bounds?: [number, number, number, number] } | null;
  onViewportIdle: (bounds: ViewportBounds) => void;
};

const eventTone: Record<string, { fill: string; stroke: string }> = {
  harassment: { fill: "190 24 93", stroke: "rgba(131, 24, 67, 0.95)" },
  assault: { fill: "185 28 28", stroke: "rgba(127, 29, 29, 0.95)" },
  robbery: { fill: "180 83 9", stroke: "rgba(120, 53, 15, 0.95)" },
  violence: { fill: "109 40 217", stroke: "rgba(76, 29, 149, 0.95)" },
};

const INITIAL_VIEW = {
  center: [10.5, 45.3] as [number, number],
  zoom: 4.2,
};

const EUROPE_BOUNDS: LngLatBoundsLike = [
  [-15, 20],
  [35, 64],
];
const DARK_STYLE_URL = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

export function MapShell({ cells, selectedCellId, focusTarget, onViewportIdle }: MapShellProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const [projectedCells, setProjectedCells] = useState<
    { id: string; label: string; score: number; count: number; dominantEventType: string; path: string }[]
  >([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: DARK_STYLE_URL,
      center: INITIAL_VIEW.center,
      zoom: INITIAL_VIEW.zoom,
      minZoom: 3,
      maxZoom: 12,
      maxBounds: EUROPE_BOUNDS,
      renderWorldCopies: false,
      attributionControl: false,
    });

    mapRef.current = map;

    const emitViewport = () => {
      const bounds = map.getBounds();
      onViewportIdle({
        west: bounds.getWest(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        north: bounds.getNorth(),
        zoom: map.getZoom(),
      });
    };

    map.on("load", emitViewport);
    map.on("idle", emitViewport);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [onViewportIdle]);

  useEffect(() => {
    if (!focusTarget || !mapRef.current) {
      return;
    }
    if (focusTarget.bounds) {
      mapRef.current.fitBounds(
        [
          [focusTarget.bounds[0], focusTarget.bounds[1]],
          [focusTarget.bounds[2], focusTarget.bounds[3]],
        ],
        { padding: 48, duration: 1200 },
      );
      return;
    }
    mapRef.current.flyTo({
      center: [focusTarget.lng, focusTarget.lat],
      zoom: focusTarget.zoom,
      essential: true,
    });
  }, [focusTarget]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const updateOverlay = () => {
      const zoom = map.getZoom();
      const expansion = zoom < 5 ? 1.85 : zoom < 7 ? 1.4 : zoom < 9 ? 1.1 : 0.92;
      const next = cells.map((cell) => ({
        id: cell.id,
        label: cell.label,
        score: cell.score,
        count: cell.incidentCount,
        dominantEventType: cell.dominantEventType,
        path: cell.polygon
          .map((point, index) => {
            const center = polygonCenter(cell.polygon);
            const scaledLng = center.lng + (point.lng - center.lng) * expansion;
            const scaledLat = center.lat + (point.lat - center.lat) * expansion;
            const projected = map.project([scaledLng, scaledLat]);
            return `${index === 0 ? "M" : "L"} ${projected.x} ${projected.y}`;
          })
          .join(" ") + " Z",
      }));
      setProjectedCells(next);
    };

    updateOverlay();
    map.on("move", updateOverlay);
    map.on("zoom", updateOverlay);

    return () => {
      map.off("move", updateOverlay);
      map.off("zoom", updateOverlay);
    };
  }, [cells]);

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-slate-950">
      <div ref={containerRef} className="h-full w-full" />
      <svg className="pointer-events-none absolute inset-0 h-full w-full">
        {projectedCells.map((cell) => {
          const active = cell.id === selectedCellId;
          const tone = eventTone[cell.dominantEventType] ?? eventTone.violence;
          const alpha = Math.max(0.32, Math.min(0.84, cell.score));
          const fill = `rgb(${tone.fill} / ${alpha})`;
          return (
            <path
              key={cell.id}
              d={cell.path}
              fill={active ? "rgba(220, 38, 38, 0.82)" : fill}
              stroke={active ? "rgba(127, 29, 29, 0.95)" : tone.stroke}
              strokeWidth={active ? 3 : 2}
            />
          );
        })}
      </svg>
      <div className="absolute right-3 top-[4.5rem] z-30 flex flex-col gap-2 md:bottom-[4.5rem] md:left-5 md:right-auto md:top-auto">
        <button
          aria-label="Zoom in"
          className="h-11 w-11 rounded-2xl border border-white/12 bg-slate-950/88 text-2xl leading-none text-white shadow-lg backdrop-blur hover:bg-slate-900"
          onClick={() => mapRef.current?.zoomIn()}
          type="button"
        >
          +
        </button>
        <button
          aria-label="Zoom out"
          className="h-11 w-11 rounded-2xl border border-white/12 bg-slate-950/88 text-2xl leading-none text-white shadow-lg backdrop-blur hover:bg-slate-900"
          onClick={() => mapRef.current?.zoomOut()}
          type="button"
        >
          -
        </button>
      </div>
    </div>
  );
}

function polygonCenter(polygon: HeatCell["polygon"]) {
  const total = polygon.reduce(
    (acc, point) => ({ lng: acc.lng + point.lng, lat: acc.lat + point.lat }),
    { lng: 0, lat: 0 },
  );
  return {
    lng: total.lng / polygon.length,
    lat: total.lat / polygon.length,
  };
}
