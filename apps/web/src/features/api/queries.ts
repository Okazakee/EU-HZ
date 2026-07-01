"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { getHeat, getIncident, getPlaces, getReports } from "./client";
import type { ViewportBounds } from "./types";
import { bboxParam, buildSearchParams, zoomBucket } from "../map/query-key";

export function useHeatQuery(bounds: ViewportBounds, enabled = true) {
  const search = buildSearchParams(bounds);
  const bbox = bboxParam(bounds);
  const zBucket = zoomBucket(bounds.zoom);
  return useQuery({
    queryKey: ["heat", zBucket, bbox],
    queryFn: () => getHeat(search),
    enabled,
    placeholderData: (previousData) => previousData,
  });
}

export function useReportsQuery(bounds: ViewportBounds, enabled = true) {
  const baseSearch = buildSearchParams(bounds);
  const bbox = bboxParam(bounds);
  const zBucket = zoomBucket(bounds.zoom);
  return useInfiniteQuery({
    queryKey: ["reportsInfinite", zBucket, bbox],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams(baseSearch);
      params.set("limit", "20");
      if (pageParam) {
        params.set("cursor", String(pageParam));
      }
      return getReports(params.toString());
    },
    enabled,
    initialPageParam: "",
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    placeholderData: (previousData) => previousData,
  });
}

export function usePlacesQuery(query: string) {
  const search = new URLSearchParams({ q: query }).toString();
  return useQuery({
    queryKey: ["places", query],
    queryFn: () => getPlaces(search),
    enabled: query.trim().length >= 2,
    staleTime: 5 * 60_000,
  });
}

export function useIncidentQuery(publicId: string | null, enabled = true) {
  return useQuery({
    queryKey: ["incident", publicId],
    queryFn: () => getIncident(publicId ?? ""),
    enabled: enabled && Boolean(publicId),
  });
}
