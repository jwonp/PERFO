import type {
  GoogleAutocompletePrediction,
  HighlightedTextSegment,
} from "./place-autocomplete.types";

export const GOOGLE_PLACE_ID_PATTERN = /^[A-Za-z0-9_-]{3,256}$/;
export const MIN_QUERY_LENGTH = 2;
export const MAX_PREDICTIONS = 6;
export const SEARCH_DEBOUNCE_MS = 180;

export const normalizePlaceId = (placeId?: string): string | undefined => {
  const trimmed = placeId?.trim();

  if (!trimmed || !GOOGLE_PLACE_ID_PATTERN.test(trimmed)) {
    return undefined;
  }

  return trimmed;
};

export const getPredictionName = (
  prediction: GoogleAutocompletePrediction,
): string => {
  const mainText = prediction.structured_formatting?.main_text?.trim();

  if (mainText) {
    return mainText;
  }

  return prediction.description.trim();
};

export const getHighlightedTextSegments = (
  prediction: GoogleAutocompletePrediction,
): HighlightedTextSegment[] => {
  const mainText =
    prediction.structured_formatting?.main_text ?? prediction.description;
  const matches =
    prediction.structured_formatting?.main_text_matched_substrings ?? [];

  if (!matches.length) {
    return [{ text: mainText, highlighted: false }];
  }

  const segments: HighlightedTextSegment[] = [];
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

  return segments;
};
