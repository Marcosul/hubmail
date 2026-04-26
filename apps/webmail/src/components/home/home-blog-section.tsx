import type { BlogPostMeta } from "@/lib/blog";
import { BlogPreviewCarousel } from "@/components/home/blog-preview-carousel";

type HomeBlogSectionProps = {
  posts: BlogPostMeta[];
};

export function HomeBlogSection({ posts }: HomeBlogSectionProps) {
  if (posts.length === 0) {
    return null;
  }

  return <BlogPreviewCarousel posts={posts} />;
}
