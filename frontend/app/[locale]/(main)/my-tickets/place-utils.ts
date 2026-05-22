const GOOGLE_PLACE_ID_PATTERN = /^[A-Za-z0-9_-]{3,256}$/;

const normalizePlaceId = (placeId?: string): string | undefined => {
    const trimmed = placeId?.trim();
    if (!trimmed || !GOOGLE_PLACE_ID_PATTERN.test(trimmed)) {
        return undefined;
    }
    return trimmed;
};

export const googleMapsSearchUrl = (venue: string, placeId?: string): string => {
    const normalizedVenue = venue.trim();
    const normalizedPlaceId = normalizePlaceId(placeId);

    if (!normalizedVenue) {
        return "";
    }

    const params = new URLSearchParams({ api: "1", query: normalizedVenue });

    if (normalizedPlaceId) {
        params.set("query_place_id", normalizedPlaceId);
    }

    return `https://www.google.com/maps/search/?${params.toString()}`;
};
