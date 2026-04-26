"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

export type BlogCarouselPost = {
  slug: string;
  title: string;
  description: string;
  date: string;
  contentPreview: string;
};

type BlogPreviewCarouselProps = {
  posts: BlogCarouselPost[];
};

function formatPublishedDate(iso: string) {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function BlogPreviewCarousel({ posts }: BlogPreviewCarouselProps) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const sectionRef = useRef<HTMLElement>(null);

  const count = posts.length;
  const slideFraction = count > 0 ? 100 / count : 100;

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + count) % count);
  }, [count]);

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % count);
  }, [count]);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    };

    el.addEventListener("keydown", onKeyDown);
    return () => el.removeEventListener("keydown", onKeyDown);
  }, [goPrev, goNext]);

  if (count === 0) {
    return null;
  }

  const showControls = count > 1;

  return (
    <section
      ref={sectionRef}
      id="blog"
      tabIndex={0}
      aria-roledescription="carousel"
      aria-label="Destaques do blog HubMail"
      className="bg-[#050505] px-4 py-16 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505] sm:px-6 sm:py-20 lg:px-8"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex flex-col gap-4 sm:mb-12 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-emerald-400/90">Blog</p>
            {/* <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Blog</h2> */}
          </div>
          <Link
            href="/blog"
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:border-white/20 hover:bg-white/10 sm:self-auto"
          >
            Ver todos os posts
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>

        <div className="relative">
          {showControls ? (
            <>
              <button
                type="button"
                onClick={goPrev}
                aria-label="Post anterior"
                className="absolute left-2 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[#0a0a0a]/90 text-white shadow-lg backdrop-blur-sm transition-colors hover:border-white/20 hover:bg-white/10 sm:left-3 sm:size-11"
              >
                <ChevronLeft className="size-5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={goNext}
                aria-label="Próximo post"
                className="absolute right-2 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[#0a0a0a]/90 text-white shadow-lg backdrop-blur-sm transition-colors hover:border-white/20 hover:bg-white/10 sm:right-3 sm:size-11"
              >
                <ChevronRight className="size-5" aria-hidden />
              </button>
            </>
          ) : null}

          <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]">
            <div
              className="flex motion-reduce:transition-none transition-[transform] duration-500 ease-out"
              style={{
                width: `${count * 100}%`,
                transform: `translateX(-${index * slideFraction}%)`,
              }}
              onTouchStart={(e) => {
                touchStartX.current = e.changedTouches[0]?.screenX ?? null;
              }}
              onTouchEnd={(e) => {
                const start = touchStartX.current;
                touchStartX.current = null;
                if (start == null || !showControls) return;
                const end = e.changedTouches[0]?.screenX ?? start;
                const dx = end - start;
                if (dx > 48) goPrev();
                else if (dx < -48) goNext();
              }}
            >
              {posts.map((post, slideIndex) => (
                <article
                  key={post.slug}
                  inert={slideIndex !== index}
                  className="box-border min-h-[220px] px-5 py-8 sm:min-h-[240px] sm:px-12 sm:py-10 lg:px-16 lg:py-12"
                  style={{ width: `${slideFraction}%` }}
                >
                  <h3 className="text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl">
                    <Link href={`/blog/${post.slug}`} className="hover:text-emerald-100">
                      {post.title}
                    </Link>
                  </h3>
                  {post.contentPreview || post.description ? (
                    <p className="mt-4 line-clamp-3 max-w-3xl text-base leading-relaxed text-neutral-400 sm:text-lg">
                      {post.contentPreview || post.description}
                    </p>
                  ) : null}
                  <p className="mt-3 text-sm text-neutral-500">Publicado em {formatPublishedDate(post.date)}</p>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-emerald-400 transition-colors hover:text-emerald-300"
                  >
                    Ler artigo
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </article>
              ))}
            </div>
          </div>

          {showControls ? (
            <div className="mt-6 flex justify-center gap-2" role="tablist" aria-label="Selecionar post">
              {posts.map((post, i) => (
                <button
                  key={post.slug}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Ir para: ${post.title}`}
                  onClick={() => setIndex(i)}
                  className={`size-2.5 rounded-full transition-colors ${
                    i === index ? "bg-emerald-400" : "bg-white/20 hover:bg-white/35"
                  }`}
                />
              ))}
            </div>
          ) : null}
        </div>

        <div className="mx-auto mt-10 flex justify-center sm:mt-12" aria-hidden>
          <div className="h-px w-96 max-w-full bg-neutral-600/60 sm:w-[36rem] lg:w-[48rem]" />
        </div>
      </div>
    </section>
  );
}
