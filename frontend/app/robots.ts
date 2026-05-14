import type { MetadataRoute } from "next";
import { supportedLocales, toAbsoluteUrl } from "@/lib/site";

const protectedPaths = supportedLocales.flatMap((locale) => [
  `/${locale}/login`,
  `/${locale}/signup`,
  `/${locale}/reset-password`,
  `/${locale}/verify`,
  `/${locale}/reserved`,
  `/${locale}/my-tickets`,
  `/${locale}/profile`,
]);

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", ...protectedPaths],
    },
    sitemap: toAbsoluteUrl("/sitemap.xml"),
  };
}
