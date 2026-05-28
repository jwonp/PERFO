import { buildPostTags } from "@/lib/posts/posts-filter-utils"
import type { PostItem, PostTagDefinition } from "@/lib/posts/posts.types"

export const mockPosts: PostItem[] = [
  {
    id: "post-001",
    title: "React server components without hand-wavy trade-offs",
    excerpt: "How we split fetching, interactivity, and cache boundaries without turning page code into soup.",
    tags: ["react", "architecture"],
    publishedAt: "2026-05-18",
  },
  {
    id: "post-002",
    title: "Next.js App Router patterns that survive product churn",
    excerpt: "A practical route structure for feature growth, URL state, and client islands.",
    tags: ["nextjs", "react"],
    publishedAt: "2026-05-10",
  },
  {
    id: "post-003",
    title: "Designing onboarding copy with fewer dead clicks",
    excerpt: "Simple messaging changes that reduced hesitation in the first-session flow.",
    tags: ["ux", "growth"],
    publishedAt: "2026-04-28",
  },
  {
    id: "post-004",
    title: "Shipping analytics events teams can actually trust",
    excerpt: "Naming, ownership, and review rules that keep dashboards from drifting out of reality.",
    tags: ["analytics", "react"],
    publishedAt: "2026-04-16",
  },
  {
    id: "post-005",
    title: "Career ladders for product engineers in messy startups",
    excerpt: "A manager-friendly rubric for scope, system thinking, and execution depth.",
    tags: ["career", "growth"],
    publishedAt: "2026-04-02",
  },
  {
    id: "post-006",
    title: "Accessibility checks we run before merging any new form",
    excerpt: "Keyboard paths, focus treatment, labels, and error states that catch most regressions early.",
    tags: ["accessibility", "design-system"],
    publishedAt: "2026-03-22",
  },
  {
    id: "post-007",
    title: "Documentation debt signals that predict support load",
    excerpt: "What repeated Slack questions reveal about missing product and engineering narratives.",
    tags: ["docs", "career"],
    publishedAt: "2026-03-09",
  },
  {
    id: "post-008",
    title: "Making design system tokens usable outside the happy path",
    excerpt: "Guardrails for marketing pages, embedded widgets, and high-variance partner surfaces.",
    tags: ["design-system", "react"],
    publishedAt: "2026-02-18",
  },
]

const postTagDefinitions: PostTagDefinition[] = [
  { slug: "react", label: "React" },
  { slug: "nextjs", label: "Next.js" },
  { slug: "ux", label: "UX" },
  { slug: "growth", label: "Growth" },
  { slug: "analytics", label: "Analytics" },
  { slug: "design-system", label: "Design System" },
  { slug: "career", label: "Career" },
  { slug: "docs", label: "Docs" },
  { slug: "accessibility", label: "Accessibility" },
  { slug: "architecture", label: "Architecture" },
  { slug: "security", label: "Security" },
]

export const mockPostTags = buildPostTags(mockPosts, postTagDefinitions)
