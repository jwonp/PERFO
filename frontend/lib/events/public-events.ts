const resolveBackendUrl = () => process.env.BACKEND_URL?.trim();

export type PublicEvent = {
  id: string;
  name: string;
  venue: string;
  detailAddress?: string;
  validDate: string;
  imageUrl?: string;
  saleOpenAt: string;
  saleCloseAt: string;
  remainingQuantity: number;
  totalQuantity: number;
  maxPerUser: number;
  discoveryMode: "LISTED" | "LINK_ONLY";
  saleStatus: "UPCOMING" | "OPEN" | "SOLD_OUT" | "CLOSED" | "INACTIVE";
  publicBookingPath: string;
};

const parseEvent = (item: Record<string, unknown>): PublicEvent => {
  return {
    id: String(item.id),
    name: String(item.name),
    venue: String(item.venue),
    detailAddress: item.detailAddress ? String(item.detailAddress) : undefined,
    validDate: String(item.validDate ?? item.validUntil ?? ""),
    imageUrl: item.imageUrl ? String(item.imageUrl) : undefined,
    saleOpenAt: String(item.saleOpenAt),
    saleCloseAt: String(item.saleCloseAt),
    remainingQuantity: Number(item.remainingQuantity ?? 0),
    totalQuantity: Number(item.totalQuantity ?? 0),
    maxPerUser: Number(item.maxPerUser ?? 1),
    discoveryMode: String(item.discoveryMode ?? "LISTED") as PublicEvent["discoveryMode"],
    saleStatus: String(item.saleStatus ?? "INACTIVE") as PublicEvent["saleStatus"],
    publicBookingPath: String(item.publicBookingPath ?? `/events/${String(item.id)}`),
  };
};

const parseJson = async (response: Response) => {
  return response.json().catch(() => null);
};

export const getPublicEvents = async (): Promise<PublicEvent[]> => {
  const backendUrl = resolveBackendUrl();

  if (!backendUrl) {
    return [];
  }

  const response = await fetch(`${backendUrl}/api/events`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  }).catch(() => null);

  if (!response?.ok) {
    return [];
  }

  const body = await parseJson(response);
  if (!Array.isArray(body)) {
    return [];
  }

  return body.map((item) => parseEvent(item as Record<string, unknown>));
};

export const getPublicEvent = async (eventId: string): Promise<PublicEvent | null> => {
  const backendUrl = resolveBackendUrl();

  if (!backendUrl || !/^\d+$/.test(eventId)) {
    return null;
  }

  const response = await fetch(`${backendUrl}/api/events/${eventId}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  }).catch(() => null);

  if (!response?.ok) {
    return null;
  }

  const body = await parseJson(response);
  if (!body || typeof body !== "object") {
    return null;
  }

  return parseEvent(body as Record<string, unknown>);
};
