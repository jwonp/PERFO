import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import LocaleSwitcher from "@/components/locale-switcher";

const LandingPage = () => {
    const t = useTranslations("landing");

    return (
        <div className="flex min-h-screen justify-center bg-perfo-bg">
            <div className="app-screen flex min-h-screen flex-col px-5 py-8">
            <header className="flex items-center justify-between">
                <h1 className="text-base font-extrabold text-perfo-primary">
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
            <main className="flex flex-1 flex-col justify-center text-center">
                <div className="mx-auto max-w-xs">
                    <h2 className="text-2xl font-extrabold leading-tight text-[var(--text)]">
                        {t("title")}
                    </h2>

                    <p className="mx-auto mt-8 max-w-[260px] text-sm leading-7 text-[var(--text-muted)]">
                        {t("description")}
                    </p>
                </div>
            </main>
            <Link
                href="/login"
                className="mb-8 inline-flex h-14 items-center justify-center rounded-lg bg-perfo-primary px-10 text-base font-bold text-white shadow-[var(--shadow-panel)] transition-colors hover:bg-perfo-primary-hover"
            >
                {t("cta")}
            </Link>

            <footer className="py-2 text-center text-xs text-perfo-text/30">
                {t("copyright")}
            </footer>
            </div>
        </div>
    );
};

export default LandingPage;
