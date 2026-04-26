import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogChrome } from "@/components/blog/blog-chrome";
import { MarkdownBody } from "@/components/blog/markdown-body";
import { getAllSlugs, getPostBySlug } from "@/lib/blog";
import { getMessages } from "@/i18n/messages";
import { getServerLocale } from "@/i18n/server";

type BlogPostPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

function formatDate(iso: string, locale: string) {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) {
    return { title: "HubMail" };
  }

  return {
    title: `${post.title} | HubMail`,
    description: post.description || undefined,
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) {
    notFound();
  }

  const locale = await getServerLocale();
  const messages = getMessages(locale);

  return (
    <BlogChrome backLabel={messages.blog.backHome} eyebrow={messages.blog.eyebrow}>
      <article>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">{post.title}</h1>
        {post.description ? (
          <p className="mt-5 max-w-3xl text-base leading-7 text-neutral-400 sm:text-lg">{post.description}</p>
        ) : null}
        <div className="mt-12 border-t border-white/10 pt-12">
          <MarkdownBody content={post.content} />
        </div>
        <p className="mt-12 border-t border-white/10 pt-6 text-sm text-neutral-500">
          {messages.blog.published} {formatDate(post.date, locale)}
        </p>
      </article>
    </BlogChrome>
  );
}
