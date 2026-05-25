import { Check } from "lucide-react";
import {
  getHighlightedTextSegments,
  normalizePlaceId,
} from "./place-autocomplete.func";
import type { GoogleAutocompletePrediction, PredictionState } from "./place-autocomplete.types";

type PlaceAutocompleteSuggestionsProps = {
  listboxId: string;
  predictions: GoogleAutocompletePrediction[];
  predictionState: PredictionState;
  highlightedIndex: number;
  selectedPlaceId?: string;
  loadingLabel: string;
  emptyLabel: string;
  onSelectPrediction: (prediction: GoogleAutocompletePrediction) => void;
  onHighlightIndex: (index: number) => void;
};

const renderHighlightedText = (prediction: GoogleAutocompletePrediction) => {
  return getHighlightedTextSegments(prediction).map((segment, index) =>
    segment.highlighted ? (
      <span key={`${segment.text}-${index}`} className="font-semibold text-primary">
        {segment.text}
      </span>
    ) : (
      <span key={`${segment.text}-${index}`}>{segment.text}</span>
    ),
  );
};

export const PlaceAutocompleteSuggestions = ({
  listboxId,
  predictions,
  predictionState,
  highlightedIndex,
  selectedPlaceId,
  loadingLabel,
  emptyLabel,
  onSelectPrediction,
  onHighlightIndex,
}: PlaceAutocompleteSuggestionsProps) => {
  return (
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
                  onPointerDown={(event) => {
                    event.preventDefault();
                  }}
                  onMouseDown={(event) => {
                    event.preventDefault();
                  }}
                  onClick={() => onSelectPrediction(prediction)}
                  onMouseEnter={() => onHighlightIndex(index)}
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
  );
};
