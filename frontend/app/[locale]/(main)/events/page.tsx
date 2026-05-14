import type { Metadata } from "next";
import PublicEventsPageContent from "@/components/events/PublicEventsPageContent";
import { getPublicEvents } from "@/lib/events/public-events";
import {
  buildLocaleAlternates,
  localizePath,
  type AppLocale,
} from "@/lib/site";

type EventsPageProps = {
  params: Promise<{ locale: AppLocale }>;
};

const seoCopy: Record<AppLocale, { title: string; description: string }> = {
  en: {
    title: "Bookable Tickets",
    description: "Browse public ticket listings and open booking pages on PERFO.",
  },
  ja: {
    title: "予約可能なチケット",
    description: "PERFOで公開中のチケット一覧と予約ページを確認できます。",
  },
  ko: {
    title: "예매 가능한 티켓",
    description: "PERFO에서 공개 중인 티켓 목록과 예매 페이지를 확인할 수 있습니다.",
  },
};

export async function generateMetadata({
  params,
}: EventsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const copy = seoCopy[locale];

  return {
    title: copy.title,
    description: copy.description,
    alternates: {
      canonical: localizePath(locale, "/events"),
      languages: buildLocaleAlternates("/events"),
    },
    openGraph: {
      title: copy.title,
      description: copy.description,
      url: localizePath(locale, "/events"),
      images: [
        {
          url: "/logo_perfo.png",
          alt: copy.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: copy.title,
      description: copy.description,
      images: ["/logo_perfo.png"],
    },
  };
}

const EventsPage = async () => {
  const events = await getPublicEvents();

  return <PublicEventsPageContent events={events} />;
};

export default EventsPage;
