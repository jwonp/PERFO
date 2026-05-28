"use client";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PostsPageContent from "@/components/posts/PostsPageContent";
import { mockPosts, mockPostTags } from "@/lib/posts/posts.mock";

const replace = vi.fn();

let currentSearchParams = new URLSearchParams();

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string, values?: Record<string, unknown>) => {
    const messages: Record<string, string> = {
      "posts.title": "Posts",
      "posts.description": "Explore product, engineering, and growth notes.",
      "posts.results": `${values?.count ?? 0} posts`,
      "posts.selectedSummary": `Selected ${values?.tags ?? ""}`,
      "posts.moreTags": "More tags",
      "posts.searchTags": "Search tags",
      "posts.noMatchingTags": "No matching tags",
      "posts.activeFilters": "Active filters",
      "posts.clearAll": "Clear all",
      "posts.emptyTitle": "No posts match those tags",
      "posts.emptyDescription": "Try removing a tag or clear all filters.",
      "posts.publishedOn": "Published",
    };

    return messages[key] ?? key;
  },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/en/posts",
  useSearchParams: () => currentSearchParams,
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace }),
}));

describe("PostsPageContent", () => {
  beforeEach(() => {
    currentSearchParams = new URLSearchParams();
    replace.mockReset();
    replace.mockImplementation((url: string) => {
      const nextQuery = url.split("?")[1] ?? "";
      currentSearchParams = new URLSearchParams(nextQuery);
    });
  });

  it("태그 선택 시 URL query를 갱신하고 결과를 좁힌다", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <PostsPageContent posts={mockPosts} tags={mockPostTags} />,
    );

    await user.click(screen.getByRole("button", { name: "React" }));
    rerender(<PostsPageContent posts={mockPosts} tags={mockPostTags} />);

    expect(replace).toHaveBeenCalledWith("/en/posts?tags=react");
    expect(screen.getAllByText("4 posts")).toHaveLength(2);
  });

  it("전체 해제 버튼이 query를 제거한다", async () => {
    const user = userEvent.setup();
    currentSearchParams = new URLSearchParams("tags=react,nextjs");

    render(<PostsPageContent posts={mockPosts} tags={mockPostTags} />);

    await user.click(screen.getByRole("button", { name: "Clear all" }));

    expect(replace).toHaveBeenCalledWith("/en/posts");
  });

  it("빈 결과 상태에서 막히지 않게 초기화 액션을 제공한다", async () => {
    const user = userEvent.setup();
    currentSearchParams = new URLSearchParams("tags=security");

    render(
      <PostsPageContent
        posts={mockPosts.filter((post) => !post.tags.includes("security"))}
        tags={mockPostTags}
      />,
    );

    expect(screen.getByText("No posts match those tags")).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "Clear all" })[0]);

    expect(replace).toHaveBeenCalledWith("/en/posts");
  });
});
