"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/lib/utils";
import { resultMeta } from "./scan.func";
import { ManualTokenEntry } from "./ManualTokenEntry";
import type { ManualTokenEntryProps, ScanResultPanelProps } from "./scan.types";

type ScanResultPanelCompositeProps = ScanResultPanelProps & Pick<
    ManualTokenEntryProps,
    "manualInputRef" | "qrToken" | "submitting" | "onQrTokenChange" | "onSubmit"
>;

const ScanResultPanel = ({
    result,
    translatedResultLabel,
    recentDetail,
    showManualEntry,
    onToggleManualEntry,
    manualInputRef,
    qrToken,
    submitting,
    onQrTokenChange,
    onSubmit,
    t,
}: ScanResultPanelCompositeProps) => (
    <section className="shrink-0 rounded-[24px] border border-border bg-[var(--surface-raised)] p-3 shadow-[var(--shadow-soft)]">
        <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-subtle)]">
                    {t("myTickets.scanRecentResult")}
                </p>
                {result ? (
                    <div className={cn("mt-2 rounded-2xl border px-3 py-2.5", resultMeta(result.result).panelClassName)}>
                        <div className="flex items-start gap-2.5">
                            {(() => {
                                const meta = resultMeta(result.result);
                                const Icon = meta.icon;

                                return (
                                    <>
                                        <div className="rounded-full bg-white/80 p-1.5 shadow-sm">
                                            <Icon className={cn("h-4 w-4", meta.bodyClassName)} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <Badge variant={meta.badgeVariant} className="max-w-full truncate">
                                                {translatedResultLabel}
                                            </Badge>
                                            <p className="mt-1 truncate text-sm font-semibold text-[var(--text)]">
                                                {result.message || translatedResultLabel}
                                            </p>
                                            {recentDetail ? (
                                                <p className="mt-1 truncate text-[11px] text-[var(--text-muted)]">
                                                    {recentDetail}
                                                </p>
                                            ) : null}
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                ) : (
                    <div className="mt-2 rounded-2xl border border-dashed border-border px-3 py-3 text-sm text-[var(--text-muted)]">
                        {t("myTickets.scanRecentEmpty")}
                    </div>
                )}
            </div>
            <Button
                type="button"
                variant="ghost"
                size="xs"
                className="rounded-full text-[var(--text-muted)]"
                onClick={onToggleManualEntry}
            >
                {showManualEntry ? t("myTickets.scanManualHide") : t("myTickets.scanManualShow")}
            </Button>
        </div>

        <ManualTokenEntry
            showManualEntry={showManualEntry}
            manualInputRef={manualInputRef}
            qrToken={qrToken}
            submitting={submitting}
            onQrTokenChange={onQrTokenChange}
            onSubmit={onSubmit}
            t={t}
        />
    </section>
);

export { ScanResultPanel };
