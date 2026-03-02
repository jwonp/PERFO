import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const t = useTranslations("authLayout");

    return (
        <div className="flex min-h-screen w-full bg-perfo-bg">
            {/* Desktop: Left brand panel */}
            <div className="hidden lg:flex lg:w-1/2 bg-perfo-primary flex-col items-center justify-center p-12 relative overflow-hidden">
                {/* Decorative circles */}
                <div className="absolute top-[-80px] left-[-80px] w-[300px] h-[300px] rounded-full bg-white/5" />
                <div className="absolute bottom-[-120px] right-[-60px] w-[400px] h-[400px] rounded-full bg-white/5" />
                <div className="absolute top-1/3 right-[-40px] w-[200px] h-[200px] rounded-full bg-white/[0.03]" />

                <div className="relative z-10 text-center max-w-md">
                    <Link href="/">
                        <h1 className="text-5xl font-extrabold text-white tracking-tight mb-6">
                            PERFO
                        </h1>
                    </Link>
                    <p className="text-xl text-white/80 font-medium leading-relaxed">
                        {t("slogan")}
                    </p>
                    <div className="mt-10 flex items-center justify-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-white/40" />
                        <div className="w-8 h-2 rounded-full bg-white/80" />
                        <div className="w-2 h-2 rounded-full bg-white/40" />
                    </div>
                </div>
            </div>

            {/* Main content area */}
            <div className="flex w-full lg:w-1/2 items-center justify-center px-4 py-8 sm:px-6 lg:px-12">
                <div className="w-full max-w-md">
                    {children}
                </div>
            </div>
        </div>
    );
}
