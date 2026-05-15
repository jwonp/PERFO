import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PublicEventDetailPageContent from "@/components/events/PublicEventDetailPageContent";
import { getPublicEvent } from "@/lib/events/public-events";
import {
  buildLocaleAlternates,
  localizePath,
  type AppLocale,
} from "@/lib/site";

type EventDetailPageProps = {
  params: Promise<{ locale: AppLocale; eventId: string }>;
};

const seoLabels: Record<
  AppLocale,
  { bookingDescription: string; linkOnlyNotice: string; missingTitle: string }
> = {
  en: {
    bookingDescription: "Book this event on PERFO.",
    linkOnlyNotice: "This event is available by direct link only.",
    missingTitle: "Event not found",
  },
  ja: {
    bookingDescription: "PERFOでこのイベントを予約できます。",
    linkOnlyNotice: "このイベントは共有リンク経由でのみ公開されています。",
    missingTitle: "イベントが見つかりません",
  },
  ko: {
    bookingDescription: "PERFO에서 이 이벤트를 예매할 수 있습니다.",
    linkOnlyNotice: "이 이벤트는 공유 링크로만 공개됩니다.",
    missingTitle: "이벤트를 찾을 수 없습니다",
  },
};

export async function generateMetadata({
  params,
}: EventDetailPageProps): Promise<Metadata> {
  const { locale, eventId } = await params;
  const event = await getPublicEvent(eventId);
  const labels = seoLabels[locale];

  if (!event) {
    return {
      title: labels.missingTitle,
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const path = `/events/${event.id}`;
  const description = [
    `${event.name} · ${event.venue}.`,
    labels.bookingDescription,
    event.discoveryMode === "LINK_ONLY" ? labels.linkOnlyNotice : null,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    title: event.name,
    description,
    alternates: {
      canonical: localizePath(locale, path),
      languages: buildLocaleAlternates(path),
    },
    robots: {
      index: event.discoveryMode === "LISTED",
      follow: true,
    },
    openGraph: {
      title: event.name,
      description,
      url: localizePath(locale, path),
      images: [
        {
          url: "/logo_perfo.png",
          alt: event.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: event.name,
      description,
      images: ["/logo_perfo.png"],
    },
  };
}

const EventDetailPage = async ({ params }: EventDetailPageProps) => {
  const { eventId } = await params;
  const event = await getPublicEvent(eventId);

  if (!event) {
    notFound();
  }

  return <PublicEventDetailPageContent event={event} />;
};

export default EventDetailPage;
