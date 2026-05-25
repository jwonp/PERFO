"use client";

import PageFilterBar from "@/components/layout/PageFilterBar";
import { Tabs, TabsButton } from "@/components/ui/tabs";
import type { TicketFilterTabsProps } from "./my-tickets.types";

const TicketFilterTabs = ({
    duplicateFilter,
    onChange,
    t,
}: TicketFilterTabsProps) => (
    <PageFilterBar>
        <Tabs className="rounded-full border border-primary/30 bg-transparent p-0">
            <TabsButton active={duplicateFilter === "ALL"} onClick={() => onChange("ALL")}>
                {t("myTickets.filterAll")}
            </TabsButton>
            <TabsButton active={duplicateFilter === "ALLOW_DUPLICATE"} onClick={() => onChange("ALLOW_DUPLICATE")}>
                {t("myTickets.filterAllowDuplicate")}
            </TabsButton>
            <TabsButton active={duplicateFilter === "NO_DUPLICATE"} onClick={() => onChange("NO_DUPLICATE")}>
                {t("myTickets.filterNoDuplicate")}
            </TabsButton>
        </Tabs>
    </PageFilterBar>
);

export { TicketFilterTabs };
