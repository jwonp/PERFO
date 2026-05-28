import type { Metadata } from "next"
import PostsPageContent from "@/components/posts/PostsPageContent"
import { mockPosts, mockPostTags } from "@/lib/posts/posts.mock"
import {
  buildLocaleAlternates,
  localizePath,
  type AppLocale,
} from "@/lib/site"

type PostsPageProps = {
  params: Promise<{ locale: AppLocale }>
}

const seoCopy: Record<AppLocale, { title: string; description: string }> = {
  en: {
    title: "Posts",
    description: "Filter PERFO posts by topic and keep the state in the URL.",
  },
  ja: {
    title: "Posts",
    description: "トピック別にPERFOの投稿を絞り込み、URLに状態を保持できます。",
  },
  ko: {
    title: "Posts",
    description: "태그로 PERFO 포스트를 필터링하고 URL에 상태를 유지할 수 있습니다.",
  },
}

export async function generateMetadata({
  params,
}: PostsPageProps): Promise<Metadata> {
  const { locale } = await params
  const copy = seoCopy[locale]

  return {
    title: copy.title,
    description: copy.description,
    alternates: {
      canonical: localizePath(locale, "/posts"),
      languages: buildLocaleAlternates("/posts"),
    },
    openGraph: {
      title: copy.title,
      description: copy.description,
      url: localizePath(locale, "/posts"),
    },
  }
}

const PostsPage = () => {
  return <PostsPageContent posts={mockPosts} tags={mockPostTags} />
}

export default PostsPage
