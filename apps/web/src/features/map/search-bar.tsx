"use client";

import { useDeferredValue, useEffect, useState } from "react";

import { usePlacesQuery } from "../api/queries";
import type { PlaceItem } from "../api/types";
import { Eyebrow, IconButton } from "../ui/atoms";

type PlaceButtonProps = {
  place: PlaceItem;
  onSelect: (place: PlaceItem) => void;
};

function PlaceButton({ place, onSelect }: PlaceButtonProps) {
  return (
    <button
      className="flex w-full cursor-pointer items-center justify-between border-b border-[var(--line-soft)]/35 px-4 py-3 text-left text-sm text-slate-100 transition hover:bg-[rgba(245,208,0,0.08)]"
      onClick={() => onSelect(place)}
      type="button"
    >
      <span>{place.label}</span>
      <Eyebrow>{place.countryCode}</Eyebrow>
    </button>
  );
}

type SearchBarProps = {
  onSelect: (place: PlaceItem) => void;
  disabled?: boolean;
};

export function SearchBar({ onSelect, disabled = false }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const showClear = query.trim().length > 0;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(deferredQuery.trim());
    }, 250);
    return () => window.clearTimeout(timer);
  }, [deferredQuery]);

  const placesQuery = usePlacesQuery(debouncedQuery);
  const places = placesQuery.data?.places ?? [];
  const countries = places.filter((place) => place.kind === "country");
  const cities = places.filter((place) => place.kind === "city");
  const showResults = debouncedQuery.length >= 2;

  const handlePick = (place: PlaceItem) => {
    setQuery(place.label);
    setDebouncedQuery("");
    onSelect(place);
  };

  return (
    <div className="relative w-full max-w-[520px]">
      <div className="relative">
        <input
          className="cyber-cut h-12 w-full border border-[var(--line)]/45 bg-[#08101b]/88 px-5 pr-14 text-sm uppercase tracking-[0.08em] text-slate-100 shadow-[0_16px_40px_rgba(2,6,23,0.45)] outline-none backdrop-blur placeholder:text-[var(--accent-alt)]/70 focus:border-[var(--accent)] focus:shadow-[0_0_0_1px_rgba(245,208,0,0.24),0_0_24px_rgba(245,208,0,0.16)] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled}
          suppressHydrationWarning
          placeholder="Search city or state"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {showClear ? (
          <IconButton
            label="Clear search"
            size="sm"
            onClick={() => {
              setQuery("");
              setDebouncedQuery("");
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2"
          >
            x
          </IconButton>
        ) : null}
      </div>
      {disabled ? null : showResults ? (
        <div className="cyber-panel cyber-panel-strong cyber-cut absolute left-0 right-0 top-14 overflow-hidden">
          {placesQuery.isLoading ? (
            <div className="cyber-title px-4 py-4 text-xs text-[var(--accent-alt)]">Scanning locations...</div>
          ) : null}
          {!placesQuery.isLoading && countries.length > 0 ? (
            <div className="border-b border-[var(--line)]/30">
              <Eyebrow className="block px-4 pt-3 pb-1 text-[11px] tracking-[0.2em]">States</Eyebrow>
              {countries.map((place) => (
                <PlaceButton key={place.key} place={place} onSelect={handlePick} />
              ))}
            </div>
          ) : null}
          {!placesQuery.isLoading && cities.length > 0 ? (
            <div>
              <Eyebrow className="block px-4 pt-3 pb-1 text-[11px] tracking-[0.2em]">Cities</Eyebrow>
              {cities.map((place) => (
                <PlaceButton key={place.key} place={place} onSelect={handlePick} />
              ))}
            </div>
          ) : null}
          {!placesQuery.isLoading && places.length === 0 ? (
            <div className="px-4 py-4 text-sm text-slate-400">No indexed city or state matched.</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
