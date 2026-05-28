import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";
import { getPublicEvents } from "@/lib/events/public-events";
import {
  buildLocaleAlternates,
  defaultLocale,
  localizePath,
  toAbsoluteUrl,
} from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const listedEvents = await getPublicEvents();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: toAbsoluteUrl(localizePath(defaultLocale, "/")),
      lastModified: now,
      alternates: {
        languages: Object.fromEntries(
          Object.entries(buildLocaleAlternates("/")).map(([locale, path]) => [
            locale,
            toAbsoluteUrl(path),
          ]),
        ),
      },
    },
    {
      url: toAbsoluteUrl(localizePath(defaultLocale, "/events")),
      lastModified: now,
      alternates: {
        languages: Object.fromEntries(
          Object.entries(buildLocaleAlternates("/events")).map(([locale, path]) => [
            locale,
            toAbsoluteUrl(path),
          ]),
        ),
      },
    },
  ];

  const eventEntries: MetadataRoute.Sitemap = listedEvents
    .filter((event) => event.discoveryMode === "LISTED")
    .map((event) => {
      const localizedPath = `/events/${event.id}`;

      return {
        url: toAbsoluteUrl(localizePath(defaultLocale, localizedPath)),
        lastModified: now,
        alternates: {
          languages: Object.fromEntries(
            Object.entries(buildLocaleAlternates(localizedPath)).map(
              ([locale, path]) => [locale, toAbsoluteUrl(path)],
            ),
          ),
        },
      };
    });

  return [...staticEntries, ...eventEntries];
}
