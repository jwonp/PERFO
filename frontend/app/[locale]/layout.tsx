import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import SessionProvider from "@/components/providers/SessionProvider";
import type { LocaleLayoutProps } from "./layout.types";

const LocaleLayout = async ({
    children,
    params,
}: LocaleLayoutProps) => {
    const { locale } = (await params) as { locale: string };

    if (!hasLocale(routing.locales, locale)) {
        notFound();
    }

    const messages = (await import(`@/messages/${locale}.json`)).default;

    return (
        <NextIntlClientProvider locale={locale} messages={messages}>
            <SessionProvider>
                {children}
            </SessionProvider>
        </NextIntlClientProvider>
    );
};

export default LocaleLayout;
