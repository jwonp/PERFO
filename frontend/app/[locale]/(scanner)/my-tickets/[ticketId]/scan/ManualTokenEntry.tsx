"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ManualTokenEntryProps } from "./scan.types";

const ManualTokenEntry = ({
    showManualEntry,
    manualInputRef,
    qrToken,
    submitting,
    onQrTokenChange,
    onSubmit,
    t,
}: ManualTokenEntryProps) => {
    if (!showManualEntry) {
        return null;
    }

    return (
        <div className="mt-3 flex items-center gap-2">
            <Input
                ref={manualInputRef}
                value={qrToken}
                onChange={(event) => onQrTokenChange(event.target.value)}
                placeholder={t("myTickets.scanPlaceholder")}
                className="h-10 rounded-xl border-border text-sm"
            />
            <Button
                type="button"
                onClick={onSubmit}
                disabled={submitting}
                size="sm"
                className="h-10 shrink-0 rounded-xl px-3"
            >
                {t("myTickets.scanSubmit")}
            </Button>
        </div>
    );
};

export { ManualTokenEntry };
