import { routing } from "@/i18n/routing";

export const siteName = "PERFO";
export const supportedLocales = routing.locales;
export const defaultLocale = routing.defaultLocale;

export type AppLocale = (typeof supportedLocales)[number];

const fallbackSiteUrl = "http://localhost:3000";

export const getSiteUrl = () => {
  const configuredUrl = process.env.NEXTAUTH_URL?.trim() || fallbackSiteUrl;

  try {
    return new URL(configuredUrl);
  } catch {
    return new URL(fallbackSiteUrl);
  }
};

export const localizePath = (locale: AppLocale, path = "/") => {
  const normalizedPath = path === "/" ? "" : path.replace(/\/+$/, "");
  return `/${locale}${normalizedPath}`;
};

export const buildLocaleAlternates = (path = "/") => {
  return Object.fromEntries(
    supportedLocales.map((locale) => [locale, localizePath(locale, path)]),
  ) as Record<AppLocale, string>;
};

export const toAbsoluteUrl = (path = "/") => {
  return new URL(path, getSiteUrl()).toString();
};
