import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import LocaleSwitcher from "@/components/locale-switcher";

export default function LandingPage() {
    const t = useTranslations("landing");

    return (
        <div className="flex min-h-screen flex-col bg-perfo-bg">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 sm:px-12 lg:px-20">
                <h1 className="text-2xl font-extrabold text-perfo-primary tracking-tight">
                    PERFO
                </h1>
                <div className="flex items-center gap-4">
                    <LocaleSwitcher />
                    <Link
                        href="/login"
                        className="text-sm font-semibold text-perfo-primary hover:text-perfo-primary-hover transition-colors"
                    >
                        {t("login")}
                    </Link>
                </div>
            </header>

            {/* Hero Section */}
            <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                <div className="max-w-2xl">
                    {/* Logo mark */}
                    <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-perfo-primary shadow-xl shadow-perfo-primary/30 sm:h-24 sm:w-24">
                        <span className="text-3xl font-extrabold text-white sm:text-4xl">P</span>
                    </div>

                    <h2 className="text-3xl font-extrabold text-perfo-text leading-tight sm:text-4xl lg:text-5xl">
                        {t("title")}
                    </h2>

                    <p className="mt-4 text-base text-perfo-text/60 leading-relaxed sm:text-lg max-w-md mx-auto">
                        {t("description")}
                    </p>

                    {/* CTA Button */}
                    <Link
                        href="/login"
                        className="mt-10 inline-flex h-14 items-center justify-center rounded-xl bg-perfo-primary px-10 text-lg font-semibold text-white shadow-xl shadow-perfo-primary/30 hover:bg-perfo-primary-hover transition-all hover:scale-[1.02] active:scale-[0.98] sm:h-16 sm:px-14 sm:text-xl"
                    >
                        {t("cta")}
                    </Link>

                    {/* Trust indicators */}
                    <p className="mt-6 text-xs text-perfo-text/40">
                        {t("trust")}
                    </p>
                </div>
            </main>

            {/* Footer */}
            <footer className="py-6 text-center text-xs text-perfo-text/30">
                {t("copyright")}
            </footer>
        </div>
    );
}
