"use client";

import { Tabs, TabsList, TabsTrigger } from "@jwonp/design-system";
import PageFilterBar from "@/components/layout/PageFilterBar";
import type { DuplicatePurchaseFilter, TicketFilterTabsProps } from "./my-tickets.types";

const TicketFilterTabs = ({
    duplicateFilter,
    onChange,
    t,
}: TicketFilterTabsProps) => (
    <PageFilterBar>
        <Tabs value={duplicateFilter} onValueChange={(v) => onChange(v as DuplicatePurchaseFilter)}>
            <TabsList>
                <TabsTrigger value="ALL">{t("myTickets.filterAll")}</TabsTrigger>
                <TabsTrigger value="ALLOW_DUPLICATE">{t("myTickets.filterAllowDuplicate")}</TabsTrigger>
                <TabsTrigger value="NO_DUPLICATE">{t("myTickets.filterNoDuplicate")}</TabsTrigger>
            </TabsList>
        </Tabs>
    </PageFilterBar>
);

export { TicketFilterTabs };
