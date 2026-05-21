"use client";

import Script from "next/script";
import { useLocale } from "next-intl";
import { Check, MapPin } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

interface PlaceAutocompleteInputProps {
  id: string;
  required?: boolean;
  value: string;
  placeId?: string;
  placeholder: string;
  onChange: (value: string) => void;
  onPlaceSelect: (place: { name: string; placeId?: string }) => void;
  loadingLabel: string;
  readyLabel: string;
  unavailableLabel: string;
  errorLabel: string;
  selectedLabel: string;
  emptyLabel: string;
}

interface GooglePredictionMatch {
  offset: number;
  length: number;
}

interface GooglePredictionFormatting {
  main_text?: string;
  secondary_text?: string;
  main_text_matched_substrings?: GooglePredictionMatch[];
}

interface GoogleAutocompletePrediction {
  description: string;
  place_id?: string;
  structured_formatting?: GooglePredictionFormatting;
}

interface GoogleAutocompleteService {
  getPlacePredictions: (
    request: {
      input: string;
      language?: string;
      types?: string[];
    },
    callback: (
      predictions: GoogleAutocompletePrediction[] | null,
      status: string,
    ) => void,
  ) => void;
}

interface GoogleMapsWindow extends Window {
  google?: {
    maps?: {
      places?: {
        AutocompleteService: new () => GoogleAutocompleteService;
      };
    };
  };
}

const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const GOOGLE_PLACE_ID_PATTERN = /^[A-Za-z0-9_-]{3,256}$/;
const MIN_QUERY_LENGTH = 2;
const MAX_PREDICTIONS = 6;
const SEARCH_DEBOUNCE_MS = 180;

type AutocompleteStatus =
  | "loading"
  | "ready"
  | "selected"
  | "unavailable"
  | "error";

type PredictionState = "idle" | "loading" | "success" | "empty";

const normalizePlaceId = (placeId?: string): string | undefined => {
  const trimmed = placeId?.trim();

  if (!trimmed || !GOOGLE_PLACE_ID_PATTERN.test(trimmed)) {
    return undefined;
  }

  return trimmed;
};

const getPredictionName = (prediction: GoogleAutocompletePrediction): string => {
  const mainText = prediction.structured_formatting?.main_text?.trim();

  if (mainText) {
    return mainText;
  }

  return prediction.description.trim();
};

const renderHighlightedText = (prediction: GoogleAutocompletePrediction) => {
  const mainText = prediction.structured_formatting?.main_text ?? prediction.description;
  const matches =
    prediction.structured_formatting?.main_text_matched_substrings ?? [];

  if (!matches.length) {
    return mainText;
  }

  const segments: Array<{
    text: string;
    highlighted: boolean;
  }> = [];
  let cursor = 0;

  for (const match of matches) {
    if (match.offset > cursor) {
      segments.push({
        text: mainText.slice(cursor, match.offset),
        highlighted: false,
      });
    }

    segments.push({
      text: mainText.slice(match.offset, match.offset + match.length),
      highlighted: true,
    });

    cursor = match.offset + match.length;
  }

  if (cursor < mainText.length) {
    segments.push({
      text: mainText.slice(cursor),
      highlighted: false,
    });
  }

  return segments.map((segment, index) =>
    segment.highlighted ? (
      <span key={`${segment.text}-${index}`} className="font-semibold text-primary">
        {segment.text}
      </span>
    ) : (
      <span key={`${segment.text}-${index}`}>{segment.text}</span>
    ),
  );
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
  loadingLabel,
  readyLabel,
  unavailableLabel,
  errorLabel,
  selectedLabel,
  emptyLabel,
}: PlaceAutocompleteInputProps) => {
  const locale = useLocale();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteServiceRef = useRef<GoogleAutocompleteService | null>(null);
  const requestIdRef = useRef(0);
  const suppressNextSearchRef = useRef(false);

  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [status, setStatus] = useState<AutocompleteStatus>(
    googleMapsApiKey ? "loading" : "unavailable",
  );
  const [predictionState, setPredictionState] =
    useState<PredictionState>("idle");
  const [predictions, setPredictions] = useState<GoogleAutocompletePrediction[]>(
    [],
  );
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const statusId = useId();
  const listboxId = useId();
  const selectedPlaceId = normalizePlaceId(placeId);

  useEffect(() => {
    if (!googleMapsApiKey) {
      setStatus("unavailable");
      return;
    }

    if (!scriptLoaded || autocompleteServiceRef.current) {
      return;
    }

    const AutocompleteService = (window as GoogleMapsWindow).google?.maps?.places
      ?.AutocompleteService;

    if (!AutocompleteService) {
      setStatus("error");
      return;
    }

    autocompleteServiceRef.current = new AutocompleteService();
    setStatus("ready");
  }, [scriptLoaded]);

  useEffect(() => {
    const service = autocompleteServiceRef.current;
    const normalizedValue = value.trim();

    if (suppressNextSearchRef.current) {
      suppressNextSearchRef.current = false;
      setPredictionState("idle");
      setPredictions([]);
      setHighlightedIndex(-1);
      setIsOpen(false);
      return;
    }

    if (!service || status === "error" || status === "unavailable") {
      return;
    }

    if (normalizedValue.length < MIN_QUERY_LENGTH) {
      setPredictionState("idle");
      setPredictions([]);
      setHighlightedIndex(-1);
      setIsOpen(false);
      return;
    }

    const nextRequestId = requestIdRef.current + 1;
    requestIdRef.current = nextRequestId;
    setPredictionState("loading");

    const timeoutId = window.setTimeout(() => {
      service.getPlacePredictions(
        {
          input: normalizedValue,
          language: locale,
          types: ["establishment", "geocode"],
        },
        (results, responseStatus) => {
          if (requestIdRef.current !== nextRequestId) {
            return;
          }

          if (responseStatus === "OK" && results?.length) {
            const nextPredictions = results.slice(0, MAX_PREDICTIONS);
            const selectedIndex = nextPredictions.findIndex(
              (prediction) =>
                normalizePlaceId(prediction.place_id) === selectedPlaceId,
            );

            setPredictions(nextPredictions);
            setPredictionState("success");
            setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
            setIsOpen(document.activeElement === inputRef.current);
            return;
          }

          if (responseStatus === "ZERO_RESULTS" || !results?.length) {
            setPredictions([]);
            setPredictionState("empty");
            setHighlightedIndex(-1);
            setIsOpen(document.activeElement === inputRef.current);
            return;
          }

          setPredictions([]);
          setPredictionState("idle");
          setHighlightedIndex(-1);
          setIsOpen(false);
          setStatus("error");
        },
      );
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [locale, selectedPlaceId, status, value]);

  const resolvedStatus: AutocompleteStatus = selectedPlaceId ? "selected" : status;
  const statusLabel =
    resolvedStatus === "selected"
      ? selectedLabel
      : resolvedStatus === "ready"
        ? readyLabel
        : resolvedStatus === "loading"
          ? loadingLabel
          : resolvedStatus === "error"
            ? errorLabel
            : unavailableLabel;

  const activeDescendantId =
    highlightedIndex >= 0 && predictions[highlightedIndex]
      ? `${listboxId}-option-${highlightedIndex}`
      : undefined;

  const shouldShowPopup = useMemo(() => {
    if (!isOpen) {
      return false;
    }

    return predictionState === "loading" || predictionState === "empty" || predictions.length > 0;
  }, [isOpen, predictionState, predictions.length]);

  const closePopup = () => {
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleSelectPrediction = (prediction: GoogleAutocompletePrediction) => {
    suppressNextSearchRef.current = true;
    setPredictionState("idle");
    setPredictions([]);
    closePopup();
    onPlaceSelect({
      name: getPredictionName(prediction),
      placeId: normalizePlaceId(prediction.place_id),
    });
  };

  const handleFocus = () => {
    if (predictions.length > 0 || predictionState === "empty") {
      setIsOpen(true);
    }
  };

  const handleBlur = () => {
    requestAnimationFrame(() => {
      if (rootRef.current?.contains(document.activeElement)) {
        return;
      }

      closePopup();
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      event.key === "ArrowDown" &&
      (predictions.length > 0 || predictionState === "empty")
    ) {
      event.preventDefault();

      if (!isOpen) {
        setIsOpen(true);
        return;
      }

      if (!predictions.length) {
        return;
      }

      setHighlightedIndex((currentIndex) =>
        currentIndex < predictions.length - 1 ? currentIndex + 1 : 0,
      );
      return;
    }

    if (event.key === "ArrowUp" && predictions.length > 0) {
      event.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((currentIndex) =>
        currentIndex > 0 ? currentIndex - 1 : predictions.length - 1,
      );
      return;
    }

    if (event.key === "Enter" && isOpen && highlightedIndex >= 0) {
      event.preventDefault();
      handleSelectPrediction(predictions[highlightedIndex]);
      return;
    }

    if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      closePopup();
    }
  };

  return (
    <div className="space-y-2">
      {googleMapsApiKey ? (
        <Script
          id="google-maps-places"
          src={`https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places&language=${locale}`}
          strategy="afterInteractive"
          onLoad={() => setScriptLoaded(true)}
          onError={() => setStatus("error")}
        />
      ) : null}

      <div ref={rootRef} className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-primary" />
        <Input
          ref={inputRef}
          id={id}
          required={required}
          role="combobox"
          value={value}
          onChange={(event) => {
            setHighlightedIndex(-1);
            setIsOpen(event.target.value.trim().length >= MIN_QUERY_LENGTH);
            onChange(event.target.value);
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-describedby={statusId}
          aria-expanded={shouldShowPopup}
          aria-controls={shouldShowPopup ? listboxId : undefined}
          aria-activedescendant={shouldShowPopup ? activeDescendantId : undefined}
          aria-autocomplete="list"
          autoComplete="off"
          className="h-11 rounded-xl border-border pl-9 pr-10 focus-visible:border-ring focus-visible:ring-ring/20"
        />

        {predictionState === "loading" ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 z-10 size-4 -translate-y-1/2 rounded-full border-2 border-[var(--text-subtle)] border-t-primary animate-spin"
          />
        ) : null}

        {shouldShowPopup ? (
          <div
            id={listboxId}
            role="listbox"
            aria-label="Venue suggestions"
            className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-lg border border-border bg-[var(--surface-raised)] shadow-[var(--shadow-soft)]"
          >
            {predictionState === "loading" ? (
              <div className="px-3 py-3 text-sm text-[var(--text-muted)]">
                {loadingLabel}
              </div>
            ) : null}

            {predictionState === "empty" ? (
              <div className="px-3 py-3 text-sm text-[var(--text-muted)]">
                {emptyLabel}
              </div>
            ) : null}

            {predictions.length > 0 ? (
              <ul className="max-h-72 space-y-1 overflow-y-auto p-1">
                {predictions.map((prediction, index) => {
                  const secondaryText =
                    prediction.structured_formatting?.secondary_text;
                  const optionId = `${listboxId}-option-${index}`;
                  const isHighlighted = highlightedIndex === index;
                  const isSelected =
                    normalizePlaceId(prediction.place_id) === selectedPlaceId;

                  return (
                    <li
                      id={optionId}
                      key={`${prediction.description}-${prediction.place_id ?? index}`}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <button
                        type="button"
                        onMouseDown={(event) => {
                          event.preventDefault();
                        }}
                        onClick={() => handleSelectPrediction(prediction)}
                        onMouseEnter={() => setHighlightedIndex(index)}
                        className={[
                          "flex w-full items-start gap-3 rounded-md px-3 py-2 text-left transition-colors",
                          isHighlighted
                            ? "bg-[var(--surface-muted)]"
                            : "bg-transparent hover:bg-[var(--surface-muted)]",
                        ].join(" ")}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-[var(--text)]">
                            {renderHighlightedText(prediction)}
                          </div>
                          {secondaryText ? (
                            <p className="truncate text-xs text-[var(--text-muted)]">
                              {secondaryText}
                            </p>
                          ) : null}
                        </div>

                        <span
                          className={[
                            "mt-0.5 shrink-0 text-primary transition-opacity",
                            isSelected ? "opacity-100" : "opacity-0",
                          ].join(" ")}
                          aria-hidden="true"
                        >
                          <Check className="size-4" />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>

      <p
        id={statusId}
        aria-live="polite"
        className="text-xs text-[var(--text-muted)]"
      >
        {statusLabel}
      </p>
    </div>
  );
};
