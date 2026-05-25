export interface GooglePredictionMatch {
  offset: number;
  length: number;
}

export interface GooglePredictionFormatting {
  main_text?: string;
  secondary_text?: string;
  main_text_matched_substrings?: GooglePredictionMatch[];
}

export interface GoogleAutocompletePrediction {
  description: string;
  place_id?: string;
  structured_formatting?: GooglePredictionFormatting;
}

export interface GoogleAutocompleteService {
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

export interface GoogleMapsWindow extends Window {
  google?: {
    maps?: {
      places?: {
        AutocompleteService: new () => GoogleAutocompleteService;
      };
    };
  };
}

export type AutocompleteStatus =
  | "loading"
  | "ready"
  | "selected"
  | "unavailable"
  | "error";

export type PredictionState = "idle" | "loading" | "success" | "empty";

export type HighlightedTextSegment = {
  text: string;
  highlighted: boolean;
};
