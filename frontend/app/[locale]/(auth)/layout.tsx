import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import type { AuthLayoutProps } from "./layout.types";

const AuthLayout = ({
    children,
}: AuthLayoutProps) => {
    const t = useTranslations("authLayout");

    return (
        <div className="ds-shell flex min-h-screen w-full">
            <div className="hidden lg:flex lg:w-[52%] xl:w-[56%]">
                <div className="flex w-full flex-col justify-between bg-[linear-gradient(180deg,#173b89_0%,#102a61_100%)] px-12 py-12 text-white xl:px-16">
                    <div className="space-y-8">
                        <div className="space-y-4">
                            <Badge variant="info" className="border border-white/15 bg-white/10 text-white">
                                {t("eyebrow")}
                            </Badge>
                            <div className="max-w-xl space-y-4">
                                <Link href="/">
                                    <h1 className="text-5xl font-extrabold tracking-tight">
                                        PERFO
                                    </h1>
                                </Link>
                                <p className="text-3xl leading-tight font-semibold">
                                    {t("slogan")}
                                </p>
                                <p className="max-w-lg text-base leading-7 text-white/78">
                                    {t("description")}
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-3 xl:grid-cols-3">
                            <div className="rounded-lg border border-white/15 bg-white/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]">
                                <div className="text-xs font-medium text-white/72">{t("statTrustLabel")}</div>
                                <div className="mt-1 text-xl font-semibold text-white">{t("statTrustValue")}</div>
                                <div className="mt-2 text-sm text-white/72">{t("statTrustMeta")}</div>
                            </div>
                            <div className="rounded-lg border border-white/15 bg-white/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]">
                                <div className="text-xs font-medium text-white/72">{t("statSpeedLabel")}</div>
                                <div className="mt-1 text-xl font-semibold text-white">{t("statSpeedValue")}</div>
                                <div className="mt-2 text-sm text-white/72">{t("statSpeedMeta")}</div>
                            </div>
                            <div className="rounded-lg border border-white/15 bg-white/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]">
                                <div className="text-xs font-medium text-white/72">{t("statCoverageLabel")}</div>
                                <div className="mt-1 text-xl font-semibold text-white">{t("statCoverageValue")}</div>
                                <div className="mt-2 text-sm text-white/72">{t("statCoverageMeta")}</div>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-white/8 px-5 py-4">
                        <div className="text-sm font-medium text-white/66">{t("panelLabel")}</div>
                        <div className="mt-2 text-xl font-semibold">{t("panelTitle")}</div>
                        <p className="mt-2 max-w-xl text-sm leading-6 text-white/74">
                            {t("panelDescription")}
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex w-full lg:w-[48%] xl:w-[44%] items-center justify-center px-4 py-8 sm:px-6 lg:px-10 xl:px-14">
                <div className="w-full max-w-md">
                    <div className="mb-6 lg:hidden">
                        <div className="space-y-3 rounded-lg border border-border/70 bg-[var(--surface-raised)] px-5 py-4 shadow-[var(--shadow-soft)]">
                            <Badge variant="info" className="w-fit">{t("eyebrow")}</Badge>
                            <div>
                                <div className="text-2xl font-bold text-perfo-primary">PERFO</div>
                                <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                                    {t("description")}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="w-full max-w-md">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthLayout;
