"use client";

import Script from "next/script";
import { useLocale } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";

interface PlaceAutocompleteInputProps {
  id: string;
  required?: boolean;
  value: string;
  placeId?: string;
  placeholder: string;
  onChange: (value: string) => void;
  onPlaceSelect: (place: { name: string; placeId?: string }) => void;
  unavailableLabel: string;
  selectedLabel: string;
}

interface GooglePlaceResult {
  name?: string;
  formatted_address?: string;
  place_id?: string;
}

interface GoogleAutocomplete {
  addListener: (eventName: "place_changed", callback: () => void) => void;
  getPlace: () => GooglePlaceResult;
}

interface GoogleMapsWindow extends Window {
  google?: {
    maps?: {
      places?: {
        Autocomplete: new (
          input: HTMLInputElement,
          options: {
            fields: string[];
            types: string[];
          },
        ) => GoogleAutocomplete;
      };
    };
  };
}

const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const GOOGLE_PLACE_ID_PATTERN = /^[A-Za-z0-9_-]{3,256}$/;

const normalizePlaceId = (placeId?: string): string | undefined => {
  const trimmed = placeId?.trim();

  if (!trimmed || !GOOGLE_PLACE_ID_PATTERN.test(trimmed)) {
    return undefined;
  }

  return trimmed;
};

export const googleMapsSearchUrl = (
  venue: string,
  placeId?: string,
): string => {
  const normalizedVenue = venue.trim();
  const normalizedPlaceId = normalizePlaceId(placeId);

  if (!normalizedVenue) {
    return "";
  }

  const params = new URLSearchParams({
    api: "1",
    query: normalizedVenue,
  });

  if (normalizedPlaceId) {
    params.set("query_place_id", normalizedPlaceId);
  }

  return `https://www.google.com/maps/search/?${params.toString()}`;
};

export const PlaceAutocompleteInput = ({
  id,
  required,
  value,
  placeId,
  placeholder,
  onChange,
  onPlaceSelect,
  unavailableLabel,
  selectedLabel,
}: PlaceAutocompleteInputProps) => {
  const locale = useLocale();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<GoogleAutocomplete | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const statusId = useId();

  useEffect(() => {
    const googleAutocomplete = (window as GoogleMapsWindow).google?.maps?.places
      ?.Autocomplete;

    if (!inputRef.current || autocompleteRef.current || !googleAutocomplete) {
      return;
    }

    const autocomplete = new googleAutocomplete(inputRef.current, {
      fields: ["name", "formatted_address", "place_id"],
      types: ["establishment", "geocode"],
    });

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      const name =
        place.name ?? place.formatted_address ?? inputRef.current?.value ?? "";

      onPlaceSelect({
        name,
        placeId: normalizePlaceId(place.place_id),
      });
    });

    autocompleteRef.current = autocomplete;
  }, [onPlaceSelect, scriptReady]);

  return (
    <div className="space-y-2">
      {googleMapsApiKey ? (
        <Script
          id="google-maps-places"
          src={`https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places&language=${locale}`}
          strategy="afterInteractive"
          onLoad={() => setScriptReady(true)}
        />
      ) : null}
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary" />
        <Input
          ref={inputRef}
          id={id}
          required={required}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          aria-describedby={statusId}
          autoComplete="off"
          className="h-11 rounded-xl border-border pl-9 focus-visible:border-ring focus-visible:ring-ring/20"
        />
      </div>
      <p id={statusId} className="text-xs text-[var(--text-muted)]">
        {placeId ? selectedLabel : unavailableLabel}
      </p>
    </div>
  );
};
