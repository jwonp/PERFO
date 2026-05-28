export type PostItem = {
  id: string
  title: string
  excerpt: string
  tags: string[]
  publishedAt: string
}

export type PostTagDefinition = {
  slug: string
  label: string
}

export type PostTag = PostTagDefinition & {
  count: number
}
