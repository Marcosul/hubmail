import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export type BlogPostMeta = {
  slug: string;
  title: string;
  description: string;
  date: string;
  /** Plain text derived from markdown body (for previews). */
  contentPreview: string;
};

/** Strip markdown to a single-line plain string for truncated previews. */
export function plainTextFromMarkdown(markdown: string): string {
  let s = markdown.trim();
  s = s.replace(/```[\s\S]*?```/g, " ");
  s = s.replace(/`[^`\n]+`/g, " ");
  s = s.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1 ");
  s = s.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1 ");
  s = s.replace(/^#{1,6}\s+/gm, "");
  s = s.replace(/^>\s?/gm, "");
  s = s.replace(/^[\t ]*(?:[-*+]|\d+\.)\s+/gm, "");
  s = s.replace(/[*_~`#|]+/g, " ");
  s = s.replace(/\n+/g, " ");
  s = s.replace(/\s{2,}/g, " ");
  return s.trim();
}

export type BlogPost = BlogPostMeta & {
  content: string;
};

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

function readSlugs(): string[] {
  if (!fs.existsSync(BLOG_DIR)) {
    return [];
  }
  return fs
    .readdirSync(BLOG_DIR)
    .filter((name) => name.endsWith(".md"))
    .map((name) => name.replace(/\.md$/, ""));
}

export function getAllPosts(): BlogPostMeta[] {
  const posts = readSlugs()
    .map((slug) => {
      const raw = fs.readFileSync(path.join(BLOG_DIR, `${slug}.md`), "utf8");
      const { data, content } = matter(raw);
      const title = typeof data.title === "string" ? data.title : slug;
      const description = typeof data.description === "string" ? data.description : "";
      const date = typeof data.date === "string" ? data.date : "";
      const fileSlug = typeof data.slug === "string" ? data.slug : slug;
      const contentPreview = plainTextFromMarkdown(typeof content === "string" ? content : "");
      return { slug: fileSlug, title, description, date, contentPreview };
    })
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  return posts;
}

export function getPostBySlug(slug: string): BlogPost | null {
  const fileBase = readSlugs().find((s) => {
    const raw = fs.readFileSync(path.join(BLOG_DIR, `${s}.md`), "utf8");
    const { data } = matter(raw);
    const fileSlug = typeof data.slug === "string" ? data.slug : s;
    return fileSlug === slug;
  });

  if (!fileBase) {
    return null;
  }

  const raw = fs.readFileSync(path.join(BLOG_DIR, `${fileBase}.md`), "utf8");
  const { data, content } = matter(raw);
  const title = typeof data.title === "string" ? data.title : fileBase;
  const description = typeof data.description === "string" ? data.description : "";
  const date = typeof data.date === "string" ? data.date : "";
  const resolvedSlug = typeof data.slug === "string" ? data.slug : fileBase;

  const body = content.trim();

  return {
    slug: resolvedSlug,
    title,
    description,
    date,
    contentPreview: plainTextFromMarkdown(body),
    content: body,
  };
}

export function getAllSlugs(): string[] {
  return getAllPosts().map((p) => p.slug);
}
