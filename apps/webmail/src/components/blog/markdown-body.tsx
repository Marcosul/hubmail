import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MarkdownBodyProps = {
  content: string;
};

export function MarkdownBody({ content }: MarkdownBodyProps) {
  return (
    <div className="blog-md text-neutral-300">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-12 text-xl font-semibold tracking-tight text-white sm:text-2xl">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-8 text-lg font-semibold tracking-tight text-white">{children}</h3>
          ),
          p: ({ children }) => <p className="mt-4 text-base leading-7 text-neutral-300 sm:text-[17px]">{children}</p>,
          a: ({ href, children }) => (
            <a
              href={href}
              className="font-medium text-emerald-400 underline decoration-emerald-400/40 underline-offset-4 hover:text-emerald-300"
            >
              {children}
            </a>
          ),
          ul: ({ children }) => <ul className="mt-4 list-disc space-y-2 pl-5 text-base leading-7">{children}</ul>,
          ol: ({ children }) => <ol className="mt-4 list-decimal space-y-2 pl-5 text-base leading-7">{children}</ol>,
          li: ({ children }) => <li className="leading-7">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="mt-6 border-l-2 border-emerald-500/60 pl-5 text-neutral-400 italic">{children}</blockquote>
          ),
          strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
          code: ({ children }) => (
            <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[0.9em] text-emerald-200">{children}</code>
          ),
          hr: () => <hr className="my-10 border-white/10" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
