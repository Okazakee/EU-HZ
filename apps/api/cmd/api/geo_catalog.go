package main

import (
	"math"
	"sort"
	"strings"
	"sync"
)

type geoMatcher struct {
	alias string
	geo   geoCell
}

var (
	catalogOnce              sync.Once
	normalizedGeoCatalog     []geoCell
	normalizedCountryCatalog []countryCell
	geoMatchers              []geoMatcher
	geoByCanonicalCity       map[string]geoCell
	geoSearchAliases         map[string][]string
)

type countryMetadata struct {
	Label   string
	Aliases []string
}

var euCountryMetadata = map[string]countryMetadata{
	"AT": {Label: "Austria", Aliases: []string{"austria", "österreich", "osterreich"}},
	"BE": {Label: "Belgium", Aliases: []string{"belgium", "belgique", "belgie"}},
	"BG": {Label: "Bulgaria", Aliases: []string{"bulgaria", "българия"}},
	"HR": {Label: "Croatia", Aliases: []string{"croatia", "hrvatska"}},
	"CY": {Label: "Cyprus", Aliases: []string{"cyprus", "kypros", "κύπρος"}},
	"CZ": {Label: "Czechia", Aliases: []string{"czechia", "czech republic", "česko", "cesko"}},
	"DK": {Label: "Denmark", Aliases: []string{"denmark", "danmark"}},
	"EE": {Label: "Estonia", Aliases: []string{"estonia", "eesti"}},
	"FI": {Label: "Finland", Aliases: []string{"finland", "suomi"}},
	"FR": {Label: "France", Aliases: []string{"france"}},
	"DE": {Label: "Germany", Aliases: []string{"germany", "deutschland"}},
	"GR": {Label: "Greece", Aliases: []string{"greece", "hellas", "ellada", "ελλάδα"}},
	"HU": {Label: "Hungary", Aliases: []string{"hungary", "magyarország", "magyarorszag"}},
	"IE": {Label: "Ireland", Aliases: []string{"ireland", "éire", "eire"}},
	"IT": {Label: "Italy", Aliases: []string{"italy", "italia"}},
	"LV": {Label: "Latvia", Aliases: []string{"latvia", "latvija"}},
	"LT": {Label: "Lithuania", Aliases: []string{"lithuania", "lietuva"}},
	"LU": {Label: "Luxembourg", Aliases: []string{"luxembourg", "luxemburg", "lëtzebuerg", "letzebuerg"}},
	"MT": {Label: "Malta", Aliases: []string{"malta"}},
	"NL": {Label: "Netherlands", Aliases: []string{"netherlands", "holland"}},
	"PL": {Label: "Poland", Aliases: []string{"poland", "polska"}},
	"PT": {Label: "Portugal", Aliases: []string{"portugal"}},
	"RO": {Label: "Romania", Aliases: []string{"romania", "românia"}},
	"SK": {Label: "Slovakia", Aliases: []string{"slovakia", "slovensko"}},
	"SI": {Label: "Slovenia", Aliases: []string{"slovenia", "slovenija"}},
	"ES": {Label: "Spain", Aliases: []string{"spain", "españa", "espana"}},
	"SE": {Label: "Sweden", Aliases: []string{"sweden", "sverige"}},
}

func geoCatalogView() []geoCell {
	ensureCatalogs()
	return normalizedGeoCatalog
}

func countryCatalogView() []countryCell {
	ensureCatalogs()
	return normalizedCountryCatalog
}

func findGeoByCityCountry(city, countryCode string) (geoCell, bool) {
	ensureCatalogs()
	geo, ok := geoByCanonicalCity[canonicalGeoKey(city, countryCode)]
	return geo, ok
}

func ensureCatalogs() {
	catalogOnce.Do(func() {
		normalizedGeoCatalog = dedupeGeoCatalog(geoCatalog)
		normalizedCountryCatalog = dedupeCountryCatalog(supplementCountryCatalog(countryCatalog, normalizedGeoCatalog))
		geoByCanonicalCity = make(map[string]geoCell, len(normalizedGeoCatalog))
		geoSearchAliases = make(map[string][]string, len(normalizedGeoCatalog))

		aliasCounts := make(map[string]int)
		for i, geo := range normalizedGeoCatalog {
			aliases := uniqueNormalizedStrings(cityLookupCandidates(geo))
			normalizedGeoCatalog[i].Aliases = aliases
			geoByCanonicalCity[canonicalGeoKey(geo.City, geo.CountryCode)] = normalizedGeoCatalog[i]
			for _, alias := range aliases {
				aliasCounts[alias]++
			}
		}

		countryAliases := make(map[string]struct{})
		for _, country := range normalizedCountryCatalog {
			for _, alias := range country.Aliases {
				countryAliases[alias] = struct{}{}
			}
		}

		geoMatchers = make([]geoMatcher, 0, len(aliasCounts))
		for _, geo := range normalizedGeoCatalog {
			searchAliases := exactCityCandidates(geo)
			for _, alias := range geo.Aliases {
				if _, ok := countryAliases[alias]; ok || aliasCounts[alias] != 1 {
					continue
				}
				searchAliases = append(searchAliases, alias)
			}
			searchAliases = uniqueNormalizedStrings(searchAliases)
			geoSearchAliases[geo.Key] = searchAliases

			for _, alias := range searchAliases {
				geoMatchers = append(geoMatchers, geoMatcher{
					alias: alias,
					geo:   geo,
				})
			}
		}

		sort.Slice(geoMatchers, func(i, j int) bool {
			if len(geoMatchers[i].alias) == len(geoMatchers[j].alias) {
				return geoMatchers[i].alias < geoMatchers[j].alias
			}
			return len(geoMatchers[i].alias) > len(geoMatchers[j].alias)
		})
	})
}

func supplementCountryCatalog(raw []countryCell, geos []geoCell) []countryCell {
	out := append([]countryCell{}, raw...)
	present := make(map[string]struct{}, len(raw))
	for _, country := range raw {
		present[strings.ToUpper(country.CountryCode)] = struct{}{}
	}

	type countryBounds struct {
		west  float64
		south float64
		east  float64
		north float64
	}

	boundsByCountry := map[string]countryBounds{}
	for _, geo := range geos {
		bounds, ok := boundsByCountry[geo.CountryCode]
		if !ok {
			boundsByCountry[geo.CountryCode] = countryBounds{
				west:  geo.West,
				south: geo.South,
				east:  geo.East,
				north: geo.North,
			}
			continue
		}
		bounds.west = math.Min(bounds.west, geo.West)
		bounds.south = math.Min(bounds.south, geo.South)
		bounds.east = math.Max(bounds.east, geo.East)
		bounds.north = math.Max(bounds.north, geo.North)
		boundsByCountry[geo.CountryCode] = bounds
	}

	for code, meta := range euCountryMetadata {
		if _, ok := present[code]; ok {
			continue
		}
		bounds, ok := boundsByCountry[code]
		if !ok {
			continue
		}

		lngPadding := math.Max(0.35, (bounds.east-bounds.west)*0.12)
		latPadding := math.Max(0.35, (bounds.north-bounds.south)*0.12)
		out = append(out, countryCell{
			Key:         strings.ToLower(code),
			Label:       meta.Label,
			CountryCode: code,
			Lat:         (bounds.south + bounds.north) / 2,
			Lng:         (bounds.west + bounds.east) / 2,
			West:        bounds.west - lngPadding,
			South:       bounds.south - latPadding,
			East:        bounds.east + lngPadding,
			North:       bounds.north + latPadding,
			Aliases:     meta.Aliases,
		})
	}

	return out
}

func dedupeGeoCatalog(raw []geoCell) []geoCell {
	seen := make(map[string]int, len(raw))
	out := make([]geoCell, 0, len(raw))

	for _, geo := range raw {
		key := canonicalGeoKey(geo.City, geo.CountryCode)
		if key == "" {
			key = canonicalGeoKey(geo.Label, geo.CountryCode)
		}
		if key == "" {
			continue
		}

		if idx, ok := seen[key]; ok {
			out[idx].Aliases = append(out[idx].Aliases, geo.Aliases...)
			out[idx].Aliases = append(out[idx].Aliases, geo.Label, geo.City)
			continue
		}

		geo.Aliases = append(append([]string{}, geo.Aliases...), geo.Label, geo.City)
		out = append(out, geo)
		seen[key] = len(out) - 1
	}

	return out
}

func dedupeCountryCatalog(raw []countryCell) []countryCell {
	seen := make(map[string]int, len(raw))
	out := make([]countryCell, 0, len(raw))

	for _, country := range raw {
		key := normalizeLookupValue(country.CountryCode)
		if key == "" {
			key = normalizeLookupValue(country.Label)
		}
		if key == "" {
			continue
		}

		if idx, ok := seen[key]; ok {
			out[idx].Aliases = append(out[idx].Aliases, country.Aliases...)
			out[idx].Aliases = append(out[idx].Aliases, country.Label, country.CountryCode)
			continue
		}

		country.Aliases = append(append([]string{}, country.Aliases...), country.Label, country.CountryCode)
		out = append(out, country)
		seen[key] = len(out) - 1
	}

	for i, country := range out {
		out[i].Aliases = uniqueNormalizedStrings(country.Aliases)
	}

	return out
}

func cityLookupCandidates(geo geoCell) []string {
	candidates := make([]string, 0, len(geo.Aliases)+2)
	candidates = append(candidates, geo.Label, geo.City)
	candidates = append(candidates, geo.Aliases...)
	return candidates
}

func exactCityCandidates(geo geoCell) []string {
	return uniqueNormalizedStrings([]string{geo.Label, geo.City})
}

func canonicalGeoKey(city, countryCode string) string {
	city = normalizeLookupValue(city)
	countryCode = normalizeLookupValue(countryCode)
	if city == "" || countryCode == "" {
		return ""
	}
	return countryCode + ":" + city
}

func normalizeLookupValue(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	if value == "" {
		return ""
	}
	value = strings.NewReplacer(
		"-", " ",
		"_", " ",
		"/", " ",
		",", " ",
		".", " ",
		"(", " ",
		")", " ",
		"'", "",
		"’", "",
	).Replace(value)
	value = collapseSpace.ReplaceAllString(value, " ")
	return strings.TrimSpace(value)
}

func uniqueNormalizedStrings(values []string) []string {
	seen := make(map[string]struct{}, len(values))
	out := make([]string, 0, len(values))
	for _, value := range values {
		normalized := normalizeLookupValue(value)
		if normalized == "" {
			continue
		}
		if _, ok := seen[normalized]; ok {
			continue
		}
		seen[normalized] = struct{}{}
		out = append(out, normalized)
	}
	return out
}

func containsLookupPhrase(text, phrase string) bool {
	if phrase == "" {
		return false
	}
	if text == phrase {
		return true
	}
	return strings.Contains(" "+text+" ", " "+phrase+" ")
}
