import type { PostItem, PostTag, PostTagDefinition } from "@/lib/posts/posts.types"

const normalizeTagList = (tags: string[]) => {
  return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))]
}

export const parseSelectedTags = (value?: string | null) => {
  if (!value) {
    return []
  }

  return normalizeTagList(value.split(","))
}

export const buildTagsQueryString = (selectedTags: string[]) => {
  return normalizeTagList(selectedTags).join(",")
}

export const toggleSelectedTag = (selectedTags: string[], slug: string) => {
  return selectedTags.includes(slug)
    ? selectedTags.filter((tag) => tag !== slug)
    : [...selectedTags, slug]
}

export const clearSelectedTags = (_selectedTags: string[]) => {
  return [] as string[]
}

export const filterPostsByTags = (posts: PostItem[], selectedTags: string[]) => {
  if (selectedTags.length === 0) {
    return [...posts].sort((left, right) =>
      right.publishedAt.localeCompare(left.publishedAt)
    )
  }

  return posts
    .filter((post) => post.tags.some((tag) => selectedTags.includes(tag)))
    .sort((left, right) => right.publishedAt.localeCompare(left.publishedAt))
}

export const buildPostTags = (
  posts: PostItem[],
  tagDefinitions: PostTagDefinition[]
): PostTag[] => {
  const counts = posts.reduce<Record<string, number>>((accumulator, post) => {
    return post.tags.reduce<Record<string, number>>(
      (postAccumulator, tag) => ({
        ...postAccumulator,
        [tag]: (postAccumulator[tag] ?? 0) + 1,
      }),
      accumulator
    )
  }, {})

  return tagDefinitions.map((tagDefinition) => ({
    ...tagDefinition,
    count: counts[tagDefinition.slug] ?? 0,
  }))
}
