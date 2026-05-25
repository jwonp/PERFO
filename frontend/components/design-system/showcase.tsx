"use client"

import { Bell, CalendarRange, CircleAlert, Clock3, Filter, Headphones, Search, Shield, Sparkles, Ticket } from "lucide-react"

import { IssuedTicketCard } from "@/components/tickets/IssuedTicketCard"
import { TicketCard } from "@/components/tickets/TicketCard"
import { ActionRow, ActionRowChevron, ActionRowLeading, ActionRowText } from "@/components/ui/action-row"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState, EmptyStateIcon, EmptyStateTitle } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ToggleRow } from "@/components/ui/toggle-row"
import { COLOR_TOKENS, ISSUED_TICKET_SAMPLE, SAMPLE_TICKETS, SPACING_TOKENS } from "./showcase.constants"
import type { SectionHeaderProps, TokenSwatchProps } from "./showcase.types"

const SectionHeader = ({
  eyebrow,
  title,
  description,
}: SectionHeaderProps) => {
  return (
    <div className="flex flex-col gap-2">
      <span className="ds-eyebrow">{eyebrow}</span>
      <div className="max-w-2xl">
        <h2 className="text-2xl font-semibold text-[var(--text)] sm:text-3xl">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)] sm:text-base">{description}</p>
      </div>
    </div>
  )
}

const TokenSwatch = ({
  name,
  variable,
  role,
}: TokenSwatchProps) => {
  return (
    <div className="ds-panel flex min-h-32 flex-col gap-3 rounded-lg border border-border p-4">
      <div className="h-12 rounded-md border border-border" style={{ backgroundColor: `var(${variable})` }} />
      <div className="space-y-1">
        <div className="font-medium text-[var(--text)]">{name}</div>
        <div className="font-mono text-xs text-[var(--text-subtle)]">{variable}</div>
        <p className="text-sm text-[var(--text-muted)]">{role}</p>
      </div>
    </div>
  )
}

const DesignSystemShowcase = () => {
  return (
    <div className="ds-shell min-h-screen">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <section className="ds-toolbar sticky top-4 z-10 rounded-lg border border-border px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <span className="ds-eyebrow">PERFO Design System</span>
              <h1 className="text-3xl font-semibold text-[var(--text)] sm:text-4xl">Operational UI foundations for ticketing screens</h1>
              <p className="max-w-3xl text-sm leading-6 text-[var(--text-muted)] sm:text-base">
                This page holds the method, tokens, and product-facing components needed to build a consistent PERFO interface in `.tsx`.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="ds-kpi rounded-lg border border-border p-3">
                <div className="text-xs font-medium text-[var(--text-subtle)]">Palette</div>
                <div className="mt-1 text-xl font-semibold text-[var(--text)]">8 roles</div>
              </div>
              <div className="ds-kpi rounded-lg border border-border p-3">
                <div className="text-xs font-medium text-[var(--text-subtle)]">Spacing</div>
                <div className="mt-1 text-xl font-semibold text-[var(--text)]">8 steps</div>
              </div>
              <div className="ds-kpi rounded-lg border border-border p-3">
                <div className="text-xs font-medium text-[var(--text-subtle)]">Radius</div>
                <div className="mt-1 text-xl font-semibold text-[var(--text)]">4 / 6 / 8</div>
              </div>
              <div className="ds-kpi rounded-lg border border-border p-3">
                <div className="text-xs font-medium text-[var(--text-subtle)]">Controls</div>
                <div className="mt-1 text-xl font-semibold text-[var(--text)]">Stable height</div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="ds-panel gap-5 rounded-lg border-border">
            <CardHeader className="px-5 pb-0 sm:px-6">
              <CardTitle className="text-xl">Command bar pattern</CardTitle>
              <CardDescription>
                The first viewport should open with working controls. This sample keeps search, filters, and queue actions visible without card nesting.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5 px-5 sm:px-6">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--text-subtle)]" />
                  <Input className="h-11 rounded-lg border-border bg-[var(--surface)] pl-9" placeholder="Search events, halls, inventory windows" />
                </div>
                <Button variant="outline" className="h-11 rounded-lg bg-[var(--surface)]">
                  <Filter className="size-4" />
                  Filters
                </Button>
                <Button className="h-11 rounded-lg">
                  <CalendarRange className="size-4" />
                  Open queue plan
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border bg-[var(--surface-muted)] p-4">
                  <div className="text-xs font-medium text-[var(--text-subtle)]">Release window</div>
                  <div className="mt-1 text-lg font-semibold text-[var(--text)]">19:30 drop</div>
                  <div className="mt-2 flex items-center gap-2 text-sm text-[var(--warning)]">
                    <Clock3 className="size-4" />
                    Queue opens in 24 min
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-[var(--surface-muted)] p-4">
                  <div className="text-xs font-medium text-[var(--text-subtle)]">High-demand alerts</div>
                  <div className="mt-1 text-lg font-semibold text-[var(--text)]">3 events flagged</div>
                  <div className="mt-2 flex items-center gap-2 text-sm text-[var(--danger)]">
                    <CircleAlert className="size-4" />
                    Phantom queue exceeds target
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-[var(--surface-muted)] p-4">
                  <div className="text-xs font-medium text-[var(--text-subtle)]">Automation</div>
                  <div className="mt-1 text-lg font-semibold text-[var(--text)]">Stable</div>
                  <div className="mt-2 flex items-center gap-2 text-sm text-[var(--success)]">
                    <Sparkles className="size-4" />
                    Retry logic active
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="ds-panel gap-5 rounded-lg border-border">
            <CardHeader className="px-5 pb-0 sm:px-6">
              <CardTitle className="text-xl">Form contract</CardTitle>
              <CardDescription>
                Labels, helper text, and fixed-height inputs should read as one family across auth, checkout, and admin tools.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-5 sm:px-6">
              <div className="space-y-2">
                <Label htmlFor="ds-email">Operator email</Label>
                <Input id="ds-email" className="h-11 rounded-lg bg-[var(--surface)]" placeholder="ops@perfo.kr" />
                <p className="text-sm text-[var(--text-muted)]">Use helper text for system context, not generic decoration.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ds-venue">Venue group</Label>
                <Input id="ds-venue" className="h-11 rounded-lg bg-[var(--surface)]" placeholder="Seoul Arts Center" />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border bg-[var(--surface-muted)] px-4 py-3">
                <ToggleRow
                  checked
                  label="Push notification policy"
                  icon={<Bell className="size-4" />}
                  onToggle={() => undefined}
                  className="w-full py-0"
                />
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-5">
          <SectionHeader
            eyebrow="Foundations"
            title="Semantic tokens drive the system"
            description="These tokens are named for intent instead of raw values, so generated UI can stay consistent as the brand evolves."
          />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {COLOR_TOKENS.map((token) => (
              <TokenSwatch key={token.variable} {...token} />
            ))}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <Card className="ds-panel rounded-lg border-border">
            <CardHeader className="px-5 pb-0 sm:px-6">
              <CardTitle className="text-xl">Type and spacing</CardTitle>
              <CardDescription>PERFO favors compact hierarchy with enough air to separate action from metadata.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 px-5 sm:px-6">
              <div className="space-y-2">
                <div className="text-3xl font-semibold text-[var(--text)]">Section headline</div>
                <div className="text-base text-[var(--text-muted)]">Readable body text for operational guidance and summaries.</div>
                <div className="font-mono text-sm text-[var(--text-subtle)]">INV-SEOUL-0421-A</div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {SPACING_TOKENS.map((token) => (
                  <div key={token} className="rounded-lg border border-border bg-[var(--surface-muted)] p-3 text-center">
                    <div className="font-medium text-[var(--text)]">{token}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="ds-panel rounded-lg border-border">
            <CardHeader className="px-5 pb-0 sm:px-6">
              <CardTitle className="text-xl">Components in context</CardTitle>
              <CardDescription>Cards, rows, empty states, and ticket modules should read like real product surfaces, not isolated samples.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-5 sm:px-6">
              <div className="flex flex-wrap gap-3">
                <Button className="rounded-lg">
                  <Ticket className="size-4" />
                  Primary action
                </Button>
                <Button variant="secondary" className="rounded-lg">
                  Secondary
                </Button>
                <Button variant="outline" className="rounded-lg bg-[var(--surface)]">
                  Outline
                </Button>
                <Button variant="ghost" className="rounded-lg">
                  Ghost
                </Button>
                <Button variant="destructive" className="rounded-lg">
                  Destructive
                </Button>
              </div>

              <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
                <IssuedTicketCard
                  ticket={ISSUED_TICKET_SAMPLE}
                  statusLabel="Issuing"
                  badgeVariant="success"
                  issuedCountLabel="Issued"
                  editLabel="Edit"
                  scanLabel="Scan"
                  canScan
                  onEdit={() => undefined}
                />
                <div className="rounded-lg border border-border bg-[var(--surface-raised)] px-4">
                  <ActionRow>
                    <ActionRowLeading>
                      <Headphones className="h-5 w-5" />
                      <ActionRowText>Customer support</ActionRowText>
                    </ActionRowLeading>
                    <ActionRowChevron />
                  </ActionRow>
                  <div className="border-t border-border" />
                  <ActionRow>
                    <ActionRowLeading>
                      <Shield className="h-5 w-5" />
                      <ActionRowText>Privacy policy</ActionRowText>
                    </ActionRowLeading>
                    <ActionRowChevron />
                  </ActionRow>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {SAMPLE_TICKETS.map((ticket) => (
                  <TicketCard
                    key={ticket.title}
                    name={ticket.title}
                    venue={ticket.venue}
                    validDate={ticket.validDate}
                    imageUrl={ticket.imageUrl}
                    usageStatus={ticket.usageStatus}
                    statusLabel={ticket.usageStatus}
                    ticketNumber={ticket.ticketNumber}
                    totalCount={ticket.totalCount}
                  />
                ))}
              </div>

              <EmptyState className="py-10">
                <EmptyStateIcon>
                  <Ticket className="h-10 w-10" />
                </EmptyStateIcon>
                <EmptyStateTitle>No matching ticket modules</EmptyStateTitle>
              </EmptyState>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  )
}

export default DesignSystemShowcase
export { DesignSystemShowcase }
