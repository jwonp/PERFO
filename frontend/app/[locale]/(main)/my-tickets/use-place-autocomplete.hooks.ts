"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useLocale } from "next-intl";
import {
  getPredictionName,
  MAX_PREDICTIONS,
  MIN_QUERY_LENGTH,
  normalizePlaceId,
  SEARCH_DEBOUNCE_MS,
} from "./place-autocomplete.func";
import type {
  AutocompleteStatus,
  GoogleAutocompletePrediction,
  GoogleAutocompleteService,
  GoogleMapsWindow,
  PredictionState,
} from "./place-autocomplete.types";

type UsePlaceAutocompleteParams = {
  value: string;
  placeId?: string;
  apiKey?: string;
  onChange: (value: string) => void;
  onPlaceSelect: (place: { name: string; placeId?: string }) => void;
};

export const usePlaceAutocomplete = ({
  value,
  placeId,
  apiKey,
  onChange,
  onPlaceSelect,
}: UsePlaceAutocompleteParams) => {
  const locale = useLocale();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteServiceRef = useRef<GoogleAutocompleteService | null>(null);
  const requestIdRef = useRef(0);
  const suppressNextSearchRef = useRef(false);

  const [status, setStatus] = useState<AutocompleteStatus>(
    apiKey ? "loading" : "unavailable",
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

  const closePopup = () => {
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const initializeAutocomplete = () => {
    if (autocompleteServiceRef.current) {
      setStatus("ready");
      return;
    }

    const AutocompleteService = (window as GoogleMapsWindow).google?.maps?.places
      ?.AutocompleteService;

    if (!AutocompleteService) {
      return;
    }

    autocompleteServiceRef.current = new AutocompleteService();
    setStatus("ready");
  };

  useEffect(() => {
    if (!apiKey) {
      setStatus("unavailable");
      return;
    }

    if (autocompleteServiceRef.current) {
      setStatus("ready");
      return;
    }

    initializeAutocomplete();
  }, [apiKey]);

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
  const activeDescendantId =
    highlightedIndex >= 0 && predictions[highlightedIndex]
      ? `${listboxId}-option-${highlightedIndex}`
      : undefined;

  const shouldShowPopup = useMemo(() => {
    if (!isOpen) {
      return false;
    }

    return (
      predictionState === "loading" ||
      predictionState === "empty" ||
      predictions.length > 0
    );
  }, [isOpen, predictionState, predictions.length]);

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

  const handleInputChange = (nextValue: string) => {
    setHighlightedIndex(-1);
    setIsOpen(nextValue.trim().length >= MIN_QUERY_LENGTH);
    onChange(nextValue);
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

  return {
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
  };
};
