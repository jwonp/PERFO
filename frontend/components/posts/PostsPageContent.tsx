"use client"

import * as React from "react"
import { useLocale, useTranslations } from "next-intl"
import { usePathname, useSearchParams } from "next/navigation"
import { useRouter } from "@/i18n/navigation"
import PageEmptyState from "@/components/layout/PageEmptyState"
import PageFilterBar from "@/components/layout/PageFilterBar"
import PageHeader from "@/components/layout/PageHeader"
import PageSection from "@/components/layout/PageSection"
import PageShell from "@/components/layout/PageShell"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Toggle } from "@/components/ui/toggle"
import { cn } from "@/lib/lib/utils"
import {
  buildTagsQueryString,
  clearSelectedTags,
  filterPostsByTags,
  parseSelectedTags,
  toggleSelectedTag,
} from "@/lib/posts/posts-filter-utils"
import type { PostItem, PostTag } from "@/lib/posts/posts.types"

type PostsPageContentProps = {
  posts: PostItem[]
  tags: PostTag[]
}

const QUICK_TAG_LIMIT = 7

const PostsPageContent = ({ posts, tags }: PostsPageContentProps) => {
  const t = useTranslations()
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [commandQuery, setCommandQuery] = React.useState("")

  const selectedTags = React.useMemo(
    () => parseSelectedTags(searchParams.get("tags")),
    [searchParams]
  )

  const filteredPosts = React.useMemo(
    () => filterPostsByTags(posts, selectedTags),
    [posts, selectedTags]
  )

  const quickTags = tags.slice(0, QUICK_TAG_LIMIT)
  const hasMoreTags = tags.length > QUICK_TAG_LIMIT
  const filteredCommandTags = tags.filter((tag) => {
    const normalizedQuery = commandQuery.trim().toLowerCase()

    if (!normalizedQuery) {
      return true
    }

    return (
      tag.label.toLowerCase().includes(normalizedQuery) ||
      tag.slug.toLowerCase().includes(normalizedQuery)
    )
  })

  const tagMap = React.useMemo(
    () => new Map(tags.map((tag) => [tag.slug, tag])),
    [tags]
  )

  const syncSelectedTags = React.useCallback(
    (nextSelectedTags: string[]) => {
      const nextSearchParams = new URLSearchParams(searchParams.toString())
      const nextTagsQuery = buildTagsQueryString(nextSelectedTags)

      if (nextTagsQuery) {
        nextSearchParams.set("tags", nextTagsQuery)
      } else {
        nextSearchParams.delete("tags")
      }

      const nextQueryString = nextSearchParams.toString()
      router.replace(nextQueryString ? `${pathname}?${nextQueryString}` : pathname)
    },
    [pathname, router, searchParams]
  )

  const handleToggleTag = React.useCallback(
    (slug: string) => {
      syncSelectedTags(toggleSelectedTag(selectedTags, slug))
    },
    [selectedTags, syncSelectedTags]
  )

  const handleClearAll = React.useCallback(() => {
    syncSelectedTags(clearSelectedTags(selectedTags))
  }, [selectedTags, syncSelectedTags])

  const selectedTagLabels = selectedTags
    .map((slug) => tagMap.get(slug)?.label ?? slug)
    .join(", ")

  return (
    <PageShell className="ds-shell">
      <div className="px-5 pb-16 pt-8">
        <PageSection spacing="lg">
          <PageHeader
            title={t("posts.title")}
            description={t("posts.description")}
            trailing={
              <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold text-[var(--text-muted)]">
                {t("posts.results", { count: filteredPosts.length })}
              </span>
            }
          />

          <section className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <PageFilterBar className="min-w-0 flex-1 flex-wrap overflow-visible">
                {quickTags.map((tag) => (
                  <Toggle
                    key={tag.slug}
                    variant="pill"
                    checked={selectedTags.includes(tag.slug)}
                    aria-label={tag.label}
                    onClick={() => handleToggleTag(tag.slug)}
                  >
                    <span>{tag.label}</span>
                    <span className="ml-2 text-xs opacity-80">{tag.count}</span>
                  </Toggle>
                ))}
              </PageFilterBar>

              {hasMoreTags ? (
                <Popover>
                  <PopoverTrigger asChild className="shrink-0">
                    <Button variant="outline" size="sm">
                      {t("posts.moreTags")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="p-3">
                    <Command>
                      <CommandInput
                        value={commandQuery}
                        onChange={(event) => setCommandQuery(event.target.value)}
                        placeholder={t("posts.searchTags")}
                        aria-label={t("posts.searchTags")}
                      />
                      <CommandList>
                        {filteredCommandTags.length === 0 ? (
                          <CommandEmpty>{t("posts.noMatchingTags")}</CommandEmpty>
                        ) : (
                          <CommandGroup>
                            {filteredCommandTags.map((tag) => {
                              const active = selectedTags.includes(tag.slug)

                              return (
                                <CommandItem
                                  key={tag.slug}
                                  aria-pressed={active}
                                  onClick={() => handleToggleTag(tag.slug)}
                                >
                                  <span className="flex items-center gap-2">
                                    <span
                                      className={cn(
                                        "inline-flex size-5 items-center justify-center rounded-full border text-[10px]",
                                        active
                                          ? "border-primary bg-primary text-primary-foreground"
                                          : "border-border text-transparent"
                                      )}
                                      aria-hidden="true"
                                    >
                                      ✓
                                    </span>
                                    <span>{tag.label}</span>
                                  </span>
                                  <span className="text-xs text-[var(--text-subtle)]">
                                    {tag.count}
                                  </span>
                                </CommandItem>
                              )
                            })}
                          </CommandGroup>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-[var(--surface-muted)] px-4 py-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[var(--text)]">
                  {t("posts.results", { count: filteredPosts.length })}
                </p>
                {selectedTags.length > 0 ? (
                  <p className="text-xs text-[var(--text-muted)]">
                    {t("posts.selectedSummary", { tags: selectedTagLabels })}
                  </p>
                ) : null}
              </div>
              {selectedTags.length > 0 ? (
                <Button variant="ghost" size="sm" onClick={handleClearAll}>
                  {t("posts.clearAll")}
                </Button>
              ) : null}
            </div>
          </section>

          {selectedTags.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-[var(--text)]">
                {t("posts.activeFilters")}
              </h2>
              <div className="flex flex-wrap gap-2">
                {selectedTags.map((slug) => (
                  <Button
                    key={slug}
                    variant="outline"
                    size="xs"
                    onClick={() => handleToggleTag(slug)}
                  >
                    {tagMap.get(slug)?.label ?? slug}
                    <span aria-hidden="true">×</span>
                  </Button>
                ))}
              </div>
            </section>
          ) : null}

          {filteredPosts.length === 0 ? (
            <div className="space-y-4">
              <PageEmptyState
                title={t("posts.emptyTitle")}
                description={t("posts.emptyDescription")}
              />
              <div className="flex justify-center">
                <Button variant="outline" onClick={handleClearAll}>
                  {t("posts.clearAll")}
                </Button>
              </div>
            </div>
          ) : (
            <section className="grid gap-4">
              {filteredPosts.map((post) => (
                <article
                  key={post.id}
                  className="rounded-3xl border border-border bg-[var(--surface-raised)] p-5 shadow-[var(--shadow-panel)]"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-subtle)]">
                    <span>{t("posts.publishedOn")}</span>
                    <time dateTime={post.publishedAt}>
                      {new Intl.DateTimeFormat(locale, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      }).format(new Date(post.publishedAt))}
                    </time>
                  </div>
                  <h2 className="mt-3 text-lg font-bold text-[var(--text)]">
                    {post.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                    {post.excerpt}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {post.tags.map((tagSlug) => (
                      <span
                        key={`${post.id}-${tagSlug}`}
                        className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold text-[var(--text-muted)]"
                      >
                        {tagMap.get(tagSlug)?.label ?? tagSlug}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </section>
          )}
        </PageSection>
      </div>
    </PageShell>
  )
}

export default PostsPageContent
