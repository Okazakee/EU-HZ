export type Point = {
  lng: number;
  lat: number;
};

export type HeatCell = {
  id: string;
  label: string;
  score: number;
  incidentCount: number;
  dominantEventType: string;
  polygon: Point[];
};

export type HeatResponse = {
  cells: HeatCell[];
};

export type ReportItem = {
  publicId: string;
  title: string;
  eventType: string;
  status: "unverified" | "corroborated" | "verified";
  occurredAt: string;
  locationLabel: string;
};

export type IncidentDetail = {
  publicId: string;
  title: string;
  summary: string;
  eventType: string;
  confidence: number;
  status: "unverified" | "corroborated" | "verified";
  occurredAt: string;
  location: {
    label: string;
    lat: number;
    lng: number;
    precision: string;
  };
  evidence: {
    sourceName: string;
    title: string;
    url: string;
    publishedAt: string;
  }[];
};

export type ReportsResponse = {
  reports: ReportItem[];
  nextCursor?: string;
};

export type PlaceItem = {
  key: string;
  label: string;
  kind: "country" | "city";
  city: string;
  countryCode: string;
  lat: number;
  lng: number;
  zoom: number;
  west?: number;
  south?: number;
  east?: number;
  north?: number;
};

export type PlacesResponse = {
  places: PlaceItem[];
};

export type ViewportBounds = {
  west: number;
  south: number;
  east: number;
  north: number;
  zoom: number;
};
