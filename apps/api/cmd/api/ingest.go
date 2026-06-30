package main

import (
	"crypto/sha1"
	"encoding/hex"
	"math"
	"net/url"
	"regexp"
	"slices"
	"strings"
	"time"
)

type sourceRecord struct {
	ID          int64  `json:"id"`
	Slug        string `json:"slug"`
	Name        string `json:"name"`
	XHandle     string `json:"xHandle"`
	CountryCode string `json:"countryCode"`
}

type rawSourceItem struct {
	ExternalID   string
	URL          string
	Title        string
	Text         string
	PublishedAt  time.Time
	LocationText string
	ContentHash  string
}

type normalizedIncident struct {
	Title         string
	Summary       string
	EventType     string
	Confidence    float64
	Status        string
	OccurredAt    time.Time
	LocationLabel string
	GeoPrecision  string
	Lat           float64
	Lng           float64
	CountryCode   string
	City          string
}

type ingestItem struct {
	XHandle     string  `json:"xHandle"`
	XPostID     string  `json:"xPostId"`
	XPostURL    string  `json:"xPostUrl"`
	XPostedAt   string  `json:"xPostedAt"`
	Title       string  `json:"title"`
	Summary     string  `json:"summary"`
	EventType   string  `json:"eventType"`
	Location    string  `json:"location"`
	CountryCode string  `json:"countryCode"`
	City        string  `json:"city"`
	Confidence  float64 `json:"confidence"`
}

type ingestRequest struct {
	Items []ingestItem `json:"items"`
}

type ingestResponse struct {
	Accepted int      `json:"accepted"`
	Rejected int      `json:"rejected"`
	Skipped  int      `json:"skipped"`
	Errors   []string `json:"errors,omitempty"`
}

type ingestFilterResponse struct {
	Items   []ingestItem `json:"items"`
	Removed int          `json:"removed"`
}

var stripTags = regexp.MustCompile(`<[^>]+>`)
var collapseSpace = regexp.MustCompile(`\s+`)

func hashText(value string) string {
	sum := sha1.Sum([]byte(value))
	return hex.EncodeToString(sum[:])
}

func normalizeText(value string) string {
	value = stripTags.ReplaceAllString(value, " ")
	value = htmlEntityFix(value)
	value = collapseSpace.ReplaceAllString(value, " ")
	return strings.TrimSpace(value)
}

func htmlEntityFix(value string) string {
	replacer := strings.NewReplacer("&amp;", "&", "&quot;", "\"", "&#39;", "'", "&lt;", "<", "&gt;", ">")
	return replacer.Replace(value)
}

type geoCell struct {
	Key         string
	Label       string
	City        string
	CountryCode string
	Lat         float64
	Lng         float64
	West        float64
	South       float64
	East        float64
	North       float64
	Polygon     []point
	Aliases     []string
}

type countryCell struct {
	Key         string
	Label       string
	CountryCode string
	Lat         float64
	Lng         float64
	West        float64
	South       float64
	East        float64
	North       float64
	Aliases     []string
}

var geoCatalog = []geoCell{
	{Key: "bru", Label: "Brussels", City: "Brussels", CountryCode: "BE", Lat: 50.8467, Lng: 4.3525, West: 4.1925, South: 50.7567, East: 4.5125, North: 50.9367, Polygon: hexPolygon(4.3525, 50.8467, 10.5), Aliases: []string{"brussels", "bruxelles", "brussel", "belgium"}},
	{Key: "par", Label: "Paris", City: "Paris", CountryCode: "FR", Lat: 48.8566, Lng: 2.3522, West: 2.1722, South: 48.7566, East: 2.5322, North: 48.9566, Polygon: hexPolygon(2.3522, 48.8566, 11.5), Aliases: []string{"paris", "france"}},
	{Key: "mil", Label: "Milan", City: "Milan", CountryCode: "IT", Lat: 45.4642, Lng: 9.1900, West: 9.0400, South: 45.3742, East: 9.3400, North: 45.5542, Polygon: hexPolygon(9.19, 45.4642, 10.0), Aliases: []string{"milan", "milano", "italy"}},
	{Key: "ber", Label: "Berlin", City: "Berlin", CountryCode: "DE", Lat: 52.5200, Lng: 13.4050, West: 13.2250, South: 52.4200, East: 13.5850, North: 52.6200, Polygon: hexPolygon(13.405, 52.52, 11.5), Aliases: []string{"berlin", "germany"}},
	{Key: "bcn", Label: "Barcelona", City: "Barcelona", CountryCode: "ES", Lat: 41.3851, Lng: 2.1734, West: 2.0134, South: 41.2951, East: 2.3334, North: 41.4751, Polygon: hexPolygon(2.1734, 41.3851, 10.5), Aliases: []string{"barcelona", "spain"}},
	{Key: "ams", Label: "Amsterdam", City: "Amsterdam", CountryCode: "NL", Lat: 52.3676, Lng: 4.9041, West: 4.7441, South: 52.2776, East: 5.0641, North: 52.4576, Polygon: hexPolygon(4.9041, 52.3676, 10.5), Aliases: []string{"amsterdam", "netherlands", "dutch"}},
	{Key: "mad", Label: "Madrid", City: "Madrid", CountryCode: "ES", Lat: 40.4168, Lng: -3.7038, West: -3.8638, South: 40.3268, East: -3.5438, North: 40.5068, Polygon: hexPolygon(-3.7038, 40.4168, 10.5), Aliases: []string{"madrid", "spain"}},
	{Key: "rom", Label: "Rome", City: "Rome", CountryCode: "IT", Lat: 41.9028, Lng: 12.4964, West: 12.3364, South: 41.8128, East: 12.6564, North: 41.9928, Polygon: hexPolygon(12.4964, 41.9028, 10.5), Aliases: []string{"rome", "roma", "italy"}},
	{Key: "war", Label: "Warsaw", City: "Warsaw", CountryCode: "PL", Lat: 52.2297, Lng: 21.0122, West: 20.8522, South: 52.1397, East: 21.1722, North: 52.3197, Polygon: hexPolygon(21.0122, 52.2297, 10.5), Aliases: []string{"warsaw", "poland"}},
	{Key: "kyi", Label: "Kyiv", City: "Kyiv", CountryCode: "UA", Lat: 50.4501, Lng: 30.5234, West: 30.3634, South: 50.3601, East: 30.6834, North: 50.5401, Polygon: hexPolygon(30.5234, 50.4501, 10.5), Aliases: []string{"kyiv", "kiev", "ukraine"}},
	{Key: "nap", Label: "Naples", City: "Naples", CountryCode: "IT", Lat: 40.8518, Lng: 14.2681, West: 14.0781, South: 40.7518, East: 14.4581, North: 40.9518, Polygon: hexPolygon(14.2681, 40.8518, 10.0), Aliases: []string{"naples", "napoli", "italy"}},
}

var countryCatalog = []countryCell{
	{Key: "it", Label: "Italy", CountryCode: "IT", Lat: 42.5, Lng: 12.5, West: 6.6, South: 36.5, East: 18.7, North: 47.2, Aliases: []string{"italy", "italia"}},
	{Key: "fr", Label: "France", CountryCode: "FR", Lat: 46.2, Lng: 2.2, West: -5.3, South: 41.2, East: 9.7, North: 51.2, Aliases: []string{"france"}},
	{Key: "de", Label: "Germany", CountryCode: "DE", Lat: 51.1, Lng: 10.4, West: 5.8, South: 47.2, East: 15.1, North: 55.1, Aliases: []string{"germany", "deutschland"}},
	{Key: "es", Label: "Spain", CountryCode: "ES", Lat: 40.2, Lng: -3.5, West: -9.5, South: 35.8, East: 3.4, North: 43.9, Aliases: []string{"spain", "espana", "españa"}},
	{Key: "be", Label: "Belgium", CountryCode: "BE", Lat: 50.7, Lng: 4.6, West: 2.5, South: 49.4, East: 6.4, North: 51.6, Aliases: []string{"belgium", "belgique", "belgie"}},
	{Key: "nl", Label: "Netherlands", CountryCode: "NL", Lat: 52.2, Lng: 5.3, West: 3.1, South: 50.7, East: 7.2, North: 53.7, Aliases: []string{"netherlands", "holland"}},
	{Key: "pl", Label: "Poland", CountryCode: "PL", Lat: 52.1, Lng: 19.4, West: 14.1, South: 49.0, East: 24.2, North: 54.9, Aliases: []string{"poland", "polska"}},
	{Key: "ua", Label: "Ukraine", CountryCode: "UA", Lat: 49.0, Lng: 31.3, West: 22.1, South: 44.3, East: 40.2, North: 52.4, Aliases: []string{"ukraine", "ukraina"}},
}

type aggregateCell struct {
	Label             string
	Count             int
	Score             float64
	DominantEventType string
	EventCounts       map[string]int
	Polygon           []point
	CentroidLng       float64
	CentroidLat       float64
	West              float64
	South             float64
	East              float64
	North             float64
}

func normalizeIngestItem(item ingestItem) (*normalizedIncident, bool) {
	title := strings.TrimSpace(item.Title)
	summary := strings.TrimSpace(item.Summary)
	if title == "" {
		return nil, false
	}

	geo, ok := findGeoByCityCountry(item.City, item.CountryCode)
	if !ok {
		geo, ok = findGeoByCityCountry(item.Location, item.CountryCode)
	}
	if !ok {
		geo, ok = locateIncident(item.Location + " " + item.City + " " + item.CountryCode)
	}
	if !ok {
		return nil, false
	}

	eventType := strings.TrimSpace(item.EventType)
	if eventType == "" {
		eventType = classifyEventType(title + " " + summary)
	}

	confidence := item.Confidence
	if confidence <= 0 || confidence > 1 {
		confidence = 0.5
	}
	status := "unverified"
	if confidence >= 0.7 {
		status = "verified"
	} else if confidence >= 0.55 {
		status = "corroborated"
	}

	if summary == "" {
		summary = title
	}
	if len(summary) > 220 {
		summary = summary[:217] + "..."
	}

	occurredAt, err := time.Parse(time.RFC3339, item.XPostedAt)
	if err != nil {
		occurredAt = time.Now().UTC()
	}

	return &normalizedIncident{
		Title:         title,
		Summary:       summary,
		EventType:     eventType,
		Confidence:    confidence,
		Status:        status,
		OccurredAt:    occurredAt.UTC(),
		LocationLabel: item.Location,
		GeoPrecision:  "city",
		Lat:           geo.Lat,
		Lng:           geo.Lng,
		CountryCode:   geo.CountryCode,
		City:          geo.City,
	}, true
}

func dedupeIngestItems(items []ingestItem) []ingestItem {
	if len(items) < 2 {
		return items
	}

	seen := make(map[string]bool, len(items))
	out := make([]ingestItem, 0, len(items))
	for _, item := range items {
		key := ingestItemKey(item)
		if seen[key] {
			continue
		}
		seen[key] = true
		out = append(out, item)
	}
	return out
}

func ingestItemKey(item ingestItem) string {
	handle := normalizeLookupValue(strings.TrimPrefix(item.XHandle, "@"))
	postID := normalizeLookupValue(item.XPostID)
	if handle != "" && postID != "" {
		return "post:" + handle + ":" + postID
	}

	url := normalizeURL(item.XPostURL)
	if url != "" {
		if handle != "" {
			return "url:" + handle + ":" + url
		}
		return "url:" + url
	}

	title := normalizeLookupValue(item.Title)
	location := normalizeLookupValue(item.Location)
	postedAt := strings.TrimSpace(item.XPostedAt)
	if handle != "" {
		return "text:" + handle + ":" + title + ":" + location + ":" + postedAt
	}
	return "text:" + title + ":" + location + ":" + postedAt
}

func classifyEventType(text string) string {
	text = strings.ToLower(text)
	switch {
	case strings.Contains(text, "harassment") || strings.Contains(text, "molest") || strings.Contains(text, "sexual assault"):
		return "harassment"
	case strings.Contains(text, "robbery") || strings.Contains(text, "theft"):
		return "robbery"
	case strings.Contains(text, "attack") || strings.Contains(text, "assault") || strings.Contains(text, "stabbing") || strings.Contains(text, "shooting"):
		return "assault"
	default:
		return "violence"
	}
}

func locateIncident(text string) (geoCell, bool) {
	ensureCatalogs()
	normalized := normalizeLookupValue(text)
	for _, matcher := range geoMatchers {
		if containsLookupPhrase(normalized, matcher.alias) {
			return matcher.geo, true
		}
	}
	return geoCell{}, false
}

func hexPolygon(centerLng, centerLat, radiusKm float64) []point {
	latScale := math.Pi / 180 * 6371
	lngScale := latScale * math.Cos(centerLat*math.Pi/180)
	if lngScale == 0 {
		lngScale = 0.0001
	}

	points := make([]point, 0, 6)
	for _, angle := range []float64{90, 30, -30, -90, -150, 150} {
		radians := angle * math.Pi / 180
		points = append(points, point{
			Lng: centerLng + (radiusKm*math.Cos(radians))/lngScale,
			Lat: centerLat + (radiusKm*math.Sin(radians))/latScale,
		})
	}
	return points
}

func buildHeatAggregates(incidents []normalizedIncident, now time.Time) map[string]aggregateCell {
	result := map[string]aggregateCell{}
	window := 180 * 24 * time.Hour

	for _, incident := range incidents {
		if incident.OccurredAt.Before(now.Add(-window)) {
			continue
		}
		geo, ok := findGeoByCityCountry(incident.City, incident.CountryCode)
		if !ok {
			geo, ok = locateIncident(incident.LocationLabel + " " + incident.City + " " + incident.CountryCode)
		}
		if !ok {
			continue
		}
		cell := result[geo.Key]
		if cell.Label == "" {
			cell = aggregateCell{
				Label:             geo.Label,
				DominantEventType: "violence",
				EventCounts:       map[string]int{},
				Polygon:           geo.Polygon,
				CentroidLng:       geo.Lng,
				CentroidLat:       geo.Lat,
				West:              geo.West,
				South:             geo.South,
				East:              geo.East,
				North:             geo.North,
			}
		}
		cell.Count++
		cell.Score += incident.Confidence
		cell.EventCounts[incident.EventType]++
		result[geo.Key] = cell
	}

	for key, cell := range result {
		if cell.Count == 0 {
			delete(result, key)
			continue
		}
		score := cell.Score / float64(cell.Count)
		if cell.Count > 1 {
			score += 0.08 * float64(min(cell.Count-1, 4))
		}
		cell.Score = minFloat(score, 0.95)
		cell.DominantEventType = dominantEventType(cell.EventCounts)
		result[key] = cell
	}

	return result
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func minFloat(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}

func dominantEventType(counts map[string]int) string {
	bestType := "violence"
	bestCount := -1
	preferredOrder := []string{"harassment", "assault", "robbery", "violence"}
	for _, eventType := range preferredOrder {
		if counts[eventType] > bestCount {
			bestType = eventType
			bestCount = counts[eventType]
		}
	}
	return bestType
}

func normalizeURL(value string) string {
	parsed, err := url.Parse(strings.TrimSpace(value))
	if err != nil {
		return strings.TrimSpace(value)
	}
	parsed.Fragment = ""
	return parsed.String()
}

func orderedGeoKeys(cells map[string]aggregateCell) []string {
	keys := make([]string, 0, len(cells))
	for key := range cells {
		keys = append(keys, key)
	}
	slices.Sort(keys)
	return keys
}

func searchPlaces(query string) []placeItem {
	query = normalizeLookupValue(query)
	if len(query) < 2 {
		return nil
	}

	seen := map[string]bool{}
	results := make([]placeItem, 0, 8)
	for _, country := range countryCatalogView() {
		if seen[country.Key] {
			continue
		}
		candidates := country.Aliases
		for _, candidate := range candidates {
			if strings.Contains(candidate, query) {
				results = append(results, placeItem{
					Key:         country.Key,
					Label:       country.Label,
					Kind:        "country",
					City:        "",
					CountryCode: country.CountryCode,
					Lat:         country.Lat,
					Lng:         country.Lng,
					Zoom:        5.4,
					West:        country.West,
					South:       country.South,
					East:        country.East,
					North:       country.North,
				})
				seen[country.Key] = true
				break
			}
		}
		if len(results) >= 8 {
			return results
		}
	}
	for _, geo := range geoCatalogView() {
		if seen[geo.Key] {
			continue
		}
		candidates := geoSearchAliases[geo.Key]
		for _, candidate := range candidates {
			if strings.Contains(candidate, query) {
				results = append(results, placeItem{
					Key:         geo.Key,
					Label:       geo.Label,
					Kind:        "city",
					City:        geo.City,
					CountryCode: geo.CountryCode,
					Lat:         geo.Lat,
					Lng:         geo.Lng,
					Zoom:        7.4,
				})
				seen[geo.Key] = true
				break
			}
		}
		if len(results) >= 8 {
			break
		}
	}
	return results
}
