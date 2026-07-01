"use client";

import maplibregl, { LngLatBoundsLike, Map } from "maplibre-gl";
import { useEffect, useRef } from "react";

import type { HeatCell, ViewportBounds } from "../api/types";

type MapShellProps = {
  cells: HeatCell[];
  selectedCellId?: string;
  focusTarget?: { lng: number; lat: number; zoom: number; bounds?: [number, number, number, number] } | null;
  onViewportIdle: (bounds: ViewportBounds) => void;
};

const eventTone: Record<string, { fill: string; stroke: string }> = {
  harassment: { fill: "190 24 93", stroke: "rgba(255, 90, 160, 0.95)" },
  assault: { fill: "185 28 28", stroke: "rgba(255, 80, 70, 0.95)" },
  robbery: { fill: "180 83 9", stroke: "rgba(255, 200, 60, 0.95)" },
  violence: { fill: "109 40 217", stroke: "rgba(180, 120, 255, 0.95)" },
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
const HEAT_SOURCE_ID = "heat-cells";
const HEAT_GLOW_LAYER_ID = "heat-cells-glow";
const HEAT_FILL_LAYER_ID = "heat-cells-fill";
const HEAT_LINE_LAYER_ID = "heat-cells-line";
const HEAT_SELECTED_FILL_LAYER_ID = "heat-cells-selected-fill";
const HEAT_SELECTED_LINE_LAYER_ID = "heat-cells-selected-line";

type HeatFeatureCollection = {
  type: "FeatureCollection";
  features: {
    type: "Feature";
    properties: {
      id: string;
      fill: string;
      fillOpacity: number;
      stroke: string;
    };
    geometry: {
      type: "Polygon";
      coordinates: [number, number][][];
    };
  }[];
};

export function MapShell({ cells, selectedCellId, focusTarget, onViewportIdle }: MapShellProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const cellsRef = useRef(cells);
  const selectedCellIdRef = useRef(selectedCellId);

  useEffect(() => {
    cellsRef.current = cells;
  }, [cells]);

  useEffect(() => {
    selectedCellIdRef.current = selectedCellId;
  }, [selectedCellId]);

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

    const syncHeatSource = () => {
      const source = map.getSource(HEAT_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      if (!source) {
        return;
      }
      source.setData(buildHeatFeatureCollection(cellsRef.current, map.getZoom()));
    };

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

    map.on("load", () => {
      applyCyberTheme(map);

      map.addSource(HEAT_SOURCE_ID, {
        type: "geojson",
        data: buildHeatFeatureCollection(cellsRef.current, map.getZoom()),
      });

      map.addLayer({
        id: HEAT_GLOW_LAYER_ID,
        type: "line",
        source: HEAT_SOURCE_ID,
        filter: ["!=", ["get", "id"], ""],
        paint: {
          "line-color": ["get", "stroke"],
          "line-width": 8,
          "line-blur": 10,
          "line-opacity": ["get", "fillOpacity"],
        },
        layout: { "line-cap": "round", "line-join": "round" },
      });

      map.addLayer({
        id: HEAT_FILL_LAYER_ID,
        type: "fill",
        source: HEAT_SOURCE_ID,
        filter: ["!=", ["get", "id"], ""],
        paint: {
          "fill-color": ["get", "fill"],
          "fill-opacity": ["get", "fillOpacity"],
        },
      });

      map.addLayer({
        id: HEAT_LINE_LAYER_ID,
        type: "line",
        source: HEAT_SOURCE_ID,
        filter: ["!=", ["get", "id"], ""],
        paint: {
          "line-color": ["get", "stroke"],
          "line-width": 2,
        },
      });

      map.addLayer({
        id: HEAT_SELECTED_FILL_LAYER_ID,
        type: "fill",
        source: HEAT_SOURCE_ID,
        filter: ["==", ["get", "id"], ""],
        paint: {
          "fill-color": "rgba(220, 38, 38, 0.82)",
          "fill-opacity": 1,
        },
      });

      map.addLayer({
        id: HEAT_SELECTED_LINE_LAYER_ID,
        type: "line",
        source: HEAT_SOURCE_ID,
        filter: ["==", ["get", "id"], ""],
        paint: {
          "line-color": "rgba(127, 29, 29, 0.95)",
          "line-width": 3,
        },
      });

      syncSelectedCell(map, selectedCellIdRef.current);
      emitViewport();
    });
    map.on("idle", emitViewport);
    map.on("zoomend", syncHeatSource);

    return () => {
      map.off("zoomend", syncHeatSource);
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
    if (!map || !map.isStyleLoaded()) {
      return;
    }
    const source = map.getSource(HEAT_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (!source) {
      return;
    }
    source.setData(buildHeatFeatureCollection(cells, map.getZoom()));
  }, [cells]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) {
      return;
    }
    syncSelectedCell(map, selectedCellId);
  }, [selectedCellId]);

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-[#05060a]">
      <div ref={containerRef} className="h-full w-full" />
      <div className="cyber-map-overlay pointer-events-none absolute inset-0 z-[1]" />
      <div className="absolute right-3 top-[4.5rem] z-30 flex flex-col gap-2 md:bottom-[4.5rem] md:left-5 md:right-auto md:top-auto">
        <button
          aria-label="Zoom in"
          className="cyber-cut h-11 w-11 border border-white/12 bg-slate-950/88 text-2xl leading-none text-white shadow-lg backdrop-blur hover:border-[var(--accent)]/45 hover:text-[var(--accent)]"
          onClick={() => mapRef.current?.zoomIn()}
          type="button"
        >
          +
        </button>
        <button
          aria-label="Zoom out"
          className="cyber-cut h-11 w-11 border border-white/12 bg-slate-950/88 text-2xl leading-none text-white shadow-lg backdrop-blur hover:border-[var(--accent)]/45 hover:text-[var(--accent)]"
          onClick={() => mapRef.current?.zoomOut()}
          type="button"
        >
          -
        </button>
      </div>
    </div>
  );
}

function buildHeatFeatureCollection(cells: HeatCell[], zoom: number): HeatFeatureCollection {
  return {
    type: "FeatureCollection",
    features: cells.map((cell) => {
      const tone = eventTone[cell.dominantEventType] ?? eventTone.violence;
      const alpha = Math.max(0.32, Math.min(0.84, cell.score));
      const scale = zoomScale(zoom) * heatScale(cell.incidentCount);
      return {
        type: "Feature",
        properties: {
          id: cell.id,
          fill: `rgb(${tone.fill})`,
          fillOpacity: alpha,
          stroke: tone.stroke,
        },
        geometry: {
          type: "Polygon",
          coordinates: [scalePolygon(cell.polygon, scale)],
        },
      };
    }),
  };
}

function syncSelectedCell(map: Map, selectedCellId?: string) {
  const selectedValue = selectedCellId ?? "";
  map.setFilter(HEAT_SELECTED_FILL_LAYER_ID, ["==", ["get", "id"], selectedValue]);
  map.setFilter(HEAT_SELECTED_LINE_LAYER_ID, ["==", ["get", "id"], selectedValue]);
  map.setFilter(HEAT_FILL_LAYER_ID, ["!=", ["get", "id"], selectedValue]);
  map.setFilter(HEAT_LINE_LAYER_ID, ["!=", ["get", "id"], selectedValue]);
}

function scalePolygon(polygon: HeatCell["polygon"], scale: number): [number, number][] {
  const center = polygonCenter(polygon);
  return [
    ...polygon.map((point) => [
      center.lng + (point.lng - center.lng) * scale,
      center.lat + (point.lat - center.lat) * scale,
    ] as [number, number]),
    (() => {
      const first = polygon[0];
      return [
        center.lng + (first.lng - center.lng) * scale,
        center.lat + (first.lat - center.lat) * scale,
      ] as [number, number];
    })(),
  ];
}

function zoomScale(zoom: number) {
  if (zoom < 5) return 1.85;
  if (zoom < 7) return 1.4;
  if (zoom < 9) return 1.1;
  return 0.92;
}

function heatScale(incidentCount: number) {
  if (incidentCount <= 1) {
    return 1;
  }
  return 1 + Math.min(Math.log2(incidentCount), 3) * 0.22;
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

type paintOverride = Record<string, unknown>;

function applyCyberTheme(map: Map) {
  const setPaint = (layerId: string, props: paintOverride) => {
    try {
      const layer = map.getLayer(layerId);
      if (!layer) {
        return;
      }
      for (const [key, value] of Object.entries(props)) {
        map.setPaintProperty(layerId, key, value);
      }
    } catch {
      // Some layers may not accept the property; ignore.
    }
  };

  setPaint("background", { "background-color": "#08090f" });

  setPaint("water", {
    "fill-color": "#0a1320",
    "fill-outline-color": "rgba(95,232,255,0.22)",
  });
  setPaint("water_shadow", {
    "fill-color": "#0c1626",
  });

  setPaint("landcover", { "fill-color": "#0c0e16" });
  setPaint("landuse", { "fill-color": "#0c0e16" });
  setPaint("landuse_residential", { "fill-color": "#0d0f18" });
  setPaint("park_national_park", { "fill-color": "#0c1510" });
  setPaint("park_nature_reserve", { "fill-color": "#0c1510" });

  setPaint("building", { "fill-color": "#0e131c", "fill-outline-color": "rgba(95,232,255,0.1)" });
  setPaint("building-top", { "fill-color": "#131c2e" });

  for (const id of ["waterway"]) {
    setPaint(id, { "line-color": "rgba(95,232,255,0.22)" });
  }

  setPaint("boundary_county", { "line-color": "rgba(245,208,0,0.16)", "line-width": 0.6 });
  setPaint("boundary_state", { "line-color": "rgba(245,208,0,0.22)", "line-width": 0.8 });
  setPaint("boundary_country_outline", { "line-color": "rgba(245,208,0,0.7)", "line-width": 1 });
  setPaint("boundary_country_inner", { "line-color": "rgba(245,208,0,0.78)", "line-width": 1 });

  try {
    map.addLayer({
      id: "boundary_country_silhouette",
      type: "line",
      source: "carto",
      "source-layer": "boundary",
      minzoom: 0,
      filter: ["==", ["get", "admin_level"], 2],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "rgba(245,208,0,0.78)",
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 1.1, 6, 1.6, 9, 2.2],
        "line-opacity": ["interpolate", ["linear"], ["zoom"], 3, 0.9, 9, 0.55],
        "line-blur": 0.6,
      },
    }, "boundary_county");
  } catch {
    // Source geometry may not be ready; ignore.
  }

  const roadTints: Record<string, string> = {
    mot: "rgba(245,208,0,0.72)",
    trunk: "rgba(255,170,40,0.62)",
    pri: "rgba(255,160,60,0.5)",
    sec: "rgba(95,232,255,0.42)",
  };
  const roadDim: Record<string, string> = { road_service: "#0a0f17", road_minor: "#0b0f17", road_path: "#0a0d12" };

  for (const id of map.getStyle().layers.map((l) => l.id)) {
    if (id.startsWith("tunnel") || id.startsWith("bridge")) {
      if (id.includes("case")) {
        setPaint(id, { "line-color": "#06070b" });
      } else if (id.includes("rail")) {
        setPaint(id, { "line-color": "rgba(95,232,255,0.18)" });
      }
      continue;
    }
    if (!id.startsWith("road_")) {
      continue;
    }
    if (id.includes("case")) {
      setPaint(id, { "line-color": "#05060a" });
      continue;
    }
    const tierKey = Object.keys(roadTints).find((t) => id.includes(`_${t}_`));
    if (tierKey) {
      setPaint(id, { "line-color": roadTints[tierKey], "line-blur": 1.4 });
      continue;
    }
    const dimKey = Object.keys(roadDim).find((base) => id.startsWith(base));
    setPaint(id, { "line-color": dimKey ? roadDim[dimKey] : "#0a0f17" });
  }

  for (const id of map.getStyle().layers.map((l) => l.id)) {
    const layer = map.getLayer(id);
    if (!layer || layer.type !== "symbol") {
      continue;
    }
    try {
      map.setPaintProperty(id, "text-halo-color", "#040508");
      map.setPaintProperty(id, "text-halo-blur", 0);
      map.setPaintProperty(id, "text-halo-width", 1.4);
      if (id.startsWith("water_name") || id.startsWith("waterway_label")) {
        map.setPaintProperty(id, "text-color", "rgba(95,232,255,0.85)");
      } else if (id.startsWith("place_country")) {
        map.setPaintProperty(id, "text-color", "rgba(245,208,0,0.92)");
      } else {
        map.setPaintProperty(id, "text-color", "rgba(244,247,251,0.92)");
      }
    } catch {
      // Symbol paint prop missing on some layers; ignore.
    }
  }
}
