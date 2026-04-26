import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BlogChrome } from "@/components/blog/blog-chrome";
import { getAllPosts } from "@/lib/blog";
import { getMessages } from "@/i18n/messages";
import { getServerLocale } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const messages = getMessages(locale);

  return {
    title: `${messages.blog.title} | HubMail`,
    description: messages.blog.description,
  };
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

export default async function BlogIndexPage() {
  const locale = await getServerLocale();
  const messages = getMessages(locale);
  const posts = getAllPosts();

  return (
    <BlogChrome backLabel={messages.blog.backHome} eyebrow={messages.blog.eyebrow}>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">{messages.blog.title}</h1>
      <p className="mt-5 max-w-2xl text-base leading-7 text-neutral-400 sm:text-lg">{messages.blog.description}</p>

      <ul className="mt-14 space-y-4">
        {posts.map((post) => (
          <li key={post.slug}>
            <Link
              href={`/blog/${post.slug}`}
              className="group flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-5 transition-colors hover:border-white/20 hover:bg-white/[0.07] sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-6"
            >
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold tracking-tight text-white sm:text-xl">{post.title}</h2>
                {post.contentPreview || post.description ? (
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-neutral-400">{post.contentPreview || post.description}</p>
                ) : null}
                <p className="mt-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
                  {messages.blog.published} {formatDate(post.date, locale)}
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-emerald-400">
                {messages.blog.readMore}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {posts.length === 0 ? (
        <p className="mt-10 text-neutral-500">{messages.common.noEntries}</p>
      ) : null}
    </BlogChrome>
  );
}
