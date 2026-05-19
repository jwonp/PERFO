import en from "@/messages/en.json";
import ja from "@/messages/ja.json";
import ko from "@/messages/ko.json";

type Locale = "en" | "ja" | "ko";

const localeErrors = {
  en: en.errors,
  ja: ja.errors,
  ko: ko.errors,
} as const;

const resolveLocaleFromPathname = (pathname: string | null): Locale => {
  const locale = pathname?.split("/")[1];
  if (locale === "en" || locale === "ja" || locale === "ko") {
    return locale;
  }

  return "en";
};

export { localeErrors, resolveLocaleFromPathname };
export type { Locale };
