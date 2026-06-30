package main

import (
	"slices"
	"testing"
	"time"
)

func TestNormalizeIngestItemFindsCityAndEvent(t *testing.T) {
	item := ingestItem{
		Title:       "Police investigate harassment reports in Brussels nightlife district",
		Summary:     "Police investigate harassment reports in Brussels nightlife district after several women were attacked late at night.",
		EventType:   "harassment",
		Location:    "Brussels",
		CountryCode: "BE",
		City:        "Brussels",
		XPostedAt:   time.Date(2026, 6, 30, 8, 0, 0, 0, time.UTC).Format(time.RFC3339),
	}

	incident, ok := normalizeIngestItem(item)
	if !ok {
		t.Fatal("expected incident to be accepted")
	}
	if incident.City != "Brussels" {
		t.Fatalf("expected Brussels, got %q", incident.City)
	}
	if incident.EventType != "harassment" {
		t.Fatalf("expected harassment, got %q", incident.EventType)
	}
}

func TestDedupeIngestItemsDropsDuplicatePostIDs(t *testing.T) {
	items := []ingestItem{
		{XHandle: "@statewatch", XPostID: "42", XPostURL: "https://x.com/statewatch/status/42", Title: "Alert", Location: "Brussels"},
		{XHandle: "statewatch", XPostID: "42", XPostURL: "https://x.com/statewatch/status/42?utm_source=test", Title: "Alert", Location: "Brussels"},
		{XHandle: "@citydesk", XPostID: "42", XPostURL: "https://x.com/citydesk/status/42", Title: "Alert", Location: "Brussels"},
	}

	got := dedupeIngestItems(items)
	if len(got) != 2 {
		t.Fatalf("expected 2 items after dedupe, got %d", len(got))
	}
}

func TestDedupeIngestItemsKeepsCrossSourceCorroboration(t *testing.T) {
	items := []ingestItem{
		{XHandle: "@source-a", Title: "Harassment reported", Location: "Brussels", XPostedAt: "2026-06-30T08:00:00Z"},
		{XHandle: "@source-b", Title: "Harassment reported", Location: "Brussels", XPostedAt: "2026-06-30T08:00:00Z"},
	}

	got := dedupeIngestItems(items)
	if len(got) != 2 {
		t.Fatalf("expected corroborating sources to remain, got %d", len(got))
	}
}

func TestBuildHeatAggregates5yWindow(t *testing.T) {
	now := time.Date(2026, 6, 30, 12, 0, 0, 0, time.UTC)
	incidents := []normalizedIncident{
		{LocationLabel: "Brussels", City: "Brussels", CountryCode: "BE", Confidence: 0.6, OccurredAt: now.Add(-2 * time.Hour)},
		{LocationLabel: "Brussels", City: "Brussels", CountryCode: "BE", Confidence: 0.7, OccurredAt: now.Add(-25 * time.Hour)},
		{LocationLabel: "Brussels", City: "Brussels", CountryCode: "BE", Confidence: 0.5, OccurredAt: now.Add(-6 * 365 * 24 * time.Hour)},
	}

	aggregates := buildHeatAggregates(incidents, now)
	if aggregates["bru"].Count != 2 {
		t.Fatalf("expected 2 Brussels incidents within 5y, got %d", aggregates["bru"].Count)
	}
	if aggregates["bru"].Score < 0.64 || aggregates["bru"].Score > 0.74 {
		t.Fatalf("expected score ~0.69 (avg 0.65 + count bonus 0.08), got %f", aggregates["bru"].Score)
	}
}

func TestGeoCatalogViewDeduplicatesCanonicalCities(t *testing.T) {
	counts := map[string]int{}
	for _, geo := range geoCatalogView() {
		key := canonicalGeoKey(geo.City, geo.CountryCode)
		counts[key]++
	}

	for key, count := range counts {
		if count != 1 {
			t.Fatalf("expected canonical city %q once, got %d", key, count)
		}
	}
}

func TestSearchPlacesCountryQueryReturnsCountryOnly(t *testing.T) {
	results := searchPlaces("italy")
	if len(results) != 1 {
		t.Fatalf("expected only Italy country result, got %d", len(results))
	}
	if results[0].Kind != "country" || results[0].Label != "Italy" {
		t.Fatalf("expected Italy country result, got %+v", results[0])
	}
}

func TestSearchPlacesCityQueryDoesNotDuplicateCity(t *testing.T) {
	results := searchPlaces("milan")
	if len(results) != 1 {
		t.Fatalf("expected one Milan result, got %d", len(results))
	}
	if results[0].Kind != "city" || results[0].Label != "Milan" {
		t.Fatalf("expected Milan city result, got %+v", results[0])
	}
}

func TestSearchPlacesKeepsUsefulCityAlias(t *testing.T) {
	results := searchPlaces("napoli")
	if len(results) != 1 {
		t.Fatalf("expected one Naples result, got %d", len(results))
	}
	if results[0].Kind != "city" || results[0].Label != "Naples" {
		t.Fatalf("expected Naples city result, got %+v", results[0])
	}
}

func TestLocateIncidentKeepsUsefulTranslatedAlias(t *testing.T) {
	geo, ok := locateIncident("Molestation reported near Bruxelles nightlife district")
	if !ok {
		t.Fatal("expected Bruxelles alias to resolve")
	}
	if geo.Label != "Brussels" {
		t.Fatalf("expected Brussels, got %+v", geo)
	}
}

func TestCountryCatalogCoversAllEUStates(t *testing.T) {
	expected := []string{
		"AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU",
		"IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
	}

	got := make([]string, 0, len(countryCatalogView()))
	for _, country := range countryCatalogView() {
		got = append(got, country.CountryCode)
	}

	for _, code := range expected {
		if !slices.Contains(got, code) {
			t.Fatalf("expected EU country %s in country catalog", code)
		}
	}
}

func TestSearchPlacesFindsNewItalianCoCapitals(t *testing.T) {
	for _, query := range []string{"andria", "trani", "cesena", "carrara", "olbia", "tempio", "iglesias", "sanluri", "villacidro", "lanusei", "tortoli"} {
		results := searchPlaces(query)
		if len(results) == 0 {
			t.Fatalf("expected at least one result for %q", query)
		}
		if results[0].Kind != "city" {
			t.Fatalf("expected first result for %q to be a city, got %+v", query, results[0])
		}
	}
}
