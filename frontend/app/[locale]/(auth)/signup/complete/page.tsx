import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CheckCircle } from "lucide-react";

export default function SignUpCompletePage() {
    const t = useTranslations();

    return (
        <div className="flex flex-col items-center text-center">
            {/* Success Icon */}
            <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-perfo-primary/10">
                <CheckCircle className="w-14 h-14 text-perfo-primary" strokeWidth={1.5} />
            </div>

            {/* Heading */}
            <h2 className="text-2xl font-bold text-perfo-text mb-2">
                {t("signupComplete.title", { email: "user@example.com" })}
            </h2>

            <p className="text-sm text-perfo-text/60 mb-10 max-w-xs leading-relaxed">
                {t("signupComplete.description")}
            </p>

            {/* CTA Button */}
            <Link
                href="/login"
                className="w-full h-12 flex items-center justify-center bg-perfo-primary hover:bg-perfo-primary-hover text-white font-semibold rounded-xl transition-colors shadow-lg shadow-perfo-primary/25"
            >
                {t("common.goToLogin")}
            </Link>
        </div>
    );
}
