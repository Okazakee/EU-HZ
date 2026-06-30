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
      className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left text-sm text-slate-100 hover:bg-white/8"
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

  const handlePick = (place: PlaceItem) => {
    setQuery(place.label);
    setDebouncedQuery("");
    onSelect(place);
  };

  return (
    <div className="relative w-full max-w-[520px]">
      <div className="relative">
        <input
          className="h-12 w-full rounded-full border border-white/15 bg-slate-950/86 px-5 pr-14 text-sm text-slate-100 shadow-[0_16px_40px_rgba(2,6,23,0.45)] outline-none backdrop-blur placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled}
          suppressHydrationWarning
          placeholder="Search a country or city"
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
      {disabled ? null : debouncedQuery.length >= 2 && places.length > 0 ? (
        <div className="absolute left-0 right-0 top-14 overflow-hidden rounded-3xl border border-white/12 bg-slate-950/96 shadow-[0_20px_60px_rgba(2,6,23,0.55)] backdrop-blur">
          {countries.length > 0 ? (
            <div className="border-b border-white/8">
              <Eyebrow className="block px-4 pt-3 pb-1 text-[10px] tracking-[0.2em]">States</Eyebrow>
              {countries.map((place) => (
                <PlaceButton key={place.key} place={place} onSelect={handlePick} />
              ))}
            </div>
          ) : null}
          {cities.length > 0 ? (
            <div>
              <Eyebrow className="block px-4 pt-3 pb-1 text-[10px] tracking-[0.2em]">Cities</Eyebrow>
              {cities.map((place) => (
                <PlaceButton key={place.key} place={place} onSelect={handlePick} />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
