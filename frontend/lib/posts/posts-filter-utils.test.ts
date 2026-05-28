import { describe, expect, it } from "vitest";
import { mockPosts } from "@/lib/posts/posts.mock";
import {
  buildTagsQueryString,
  clearSelectedTags,
  filterPostsByTags,
  parseSelectedTags,
} from "@/lib/posts/posts-filter-utils";

describe("posts filter utils", () => {
  it("query string에서 선택 태그를 정규화해 복원한다", () => {
    expect(parseSelectedTags("react,nextjs,react,,unknown,")).toEqual([
      "react",
      "nextjs",
      "unknown",
    ]);
  });

  it("선택 태그를 query string 형식으로 직렬화한다", () => {
    expect(buildTagsQueryString(["nextjs", "react", "nextjs"])).toBe(
      "nextjs,react",
    );
    expect(buildTagsQueryString([])).toBe("");
  });

  it("OR 조건으로 포스트를 필터링한다", () => {
    const filteredPosts = filterPostsByTags(mockPosts, ["react", "career"]);

    expect(filteredPosts.map(({ id }) => id)).toEqual([
      "post-001",
      "post-002",
      "post-004",
      "post-005",
      "post-007",
      "post-008",
    ]);
  });

  it("전체 해제 시 빈 선택 상태를 반환한다", () => {
    expect(clearSelectedTags(["react", "nextjs"])).toEqual([]);
  });
});
