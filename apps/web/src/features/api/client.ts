import type { HeatResponse, IncidentDetail, PlacesResponse, ReportItem, ReportsResponse } from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
  (process.env.NODE_ENV !== "production" ? "http://localhost:8080" : "");

export type DevFailMode = "off" | "500" | "network" | "503";

export let devFailNext: DevFailMode = "off";

export function armDevFail(mode: DevFailMode) {
  devFailNext = mode;
}

async function getJSON<T>(path: string): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");
  }
  if (devFailNext !== "off") {
    const mode = devFailNext;
    devFailNext = "off";
    if (mode === "network") {
      throw new Error("DevTools: simulated network failure (fetch aborted)");
    }
    const status = mode === "503" ? 503 : 500;
    throw new Error(`Request failed: ${status}`);
  }
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

function isReportItem(value: unknown): value is ReportItem {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as ReportItem).publicId === "string" &&
      typeof (value as ReportItem).title === "string",
  );
}

export function getHeat(search: string) {
  return getJSON<HeatResponse>(`/v1/heat?${search}`);
}

export function getReports(search: string) {
  return getJSON<ReportsResponse>(`/v1/reports?${search}`).then((response) => ({
    ...response,
    reports: Array.isArray(response.reports) ? response.reports.filter(isReportItem) : [],
  }));
}

export function getPlaces(search: string) {
  return getJSON<PlacesResponse>(`/v1/places?${search}`);
}

export function getIncident(publicId: string) {
  return getJSON<IncidentDetail>(`/v1/incidents/${publicId}`);
}
