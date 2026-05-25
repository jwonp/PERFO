"use client";

import Script from "next/script";
import { MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PlaceAutocompleteSuggestions } from "./PlaceAutocompleteSuggestions";
import { usePlaceAutocomplete } from "./use-place-autocomplete.hooks";

interface PlaceAutocompleteInputProps {
  id: string;
  required?: boolean;
  value: string;
  placeId?: string;
  apiKey?: string;
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

export const PlaceAutocompleteInput = ({
  id,
  required,
  value,
  placeId,
  apiKey,
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
  const googleMapsApiKey = apiKey ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const {
    inputRef,
    rootRef,
    statusId,
    listboxId,
    predictions,
    predictionState,
    resolvedStatus,
    highlightedIndex,
    selectedPlaceId,
    shouldShowPopup,
    activeDescendantId,
    initializeAutocomplete,
    setStatus,
    setHighlightedIndex,
    handleSelectPrediction,
    handleFocus,
    handleBlur,
    handleInputChange,
    handleKeyDown,
  } = usePlaceAutocomplete({
    value,
    placeId,
    apiKey: googleMapsApiKey,
    onChange,
    onPlaceSelect,
  });

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

  return (
    <div className="space-y-2">
      {googleMapsApiKey ? (
        <Script
          id="google-maps-places"
          src={`https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places`}
          strategy="afterInteractive"
          onReady={initializeAutocomplete}
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
          onChange={(event) => handleInputChange(event.target.value)}
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
          <PlaceAutocompleteSuggestions
            listboxId={listboxId}
            predictions={predictions}
            predictionState={predictionState}
            highlightedIndex={highlightedIndex}
            selectedPlaceId={selectedPlaceId}
            loadingLabel={loadingLabel}
            emptyLabel={emptyLabel}
            onSelectPrediction={handleSelectPrediction}
            onHighlightIndex={setHighlightedIndex}
          />
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
