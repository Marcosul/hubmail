import { Paperclip, Send, X } from "lucide-react";
import { cn } from "@/lib/utils";

type EmailComposerCardProps = {
  className?: string;
  compact?: boolean;
};

export function EmailComposerCard({ className, compact = false }: EmailComposerCardProps) {
  return (
    <section
      className={cn(
        "flex h-full min-h-[320px] flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-hub-border dark:bg-[#0f0f0f]",
        className,
      )}
      aria-label="Compose email"
    >
      <header className="flex items-center justify-between border-b border-neutral-200 px-3 py-2 dark:border-hub-border">
        <h2 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">New Message</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="rounded p-1 text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-white/10"
            aria-label="Expand compose"
          >
            <svg viewBox="0 0 20 20" className="size-4" fill="none" aria-hidden>
              <path d="M7 4H4v3M13 16h3v-3M4 13v3h3M16 7V4h-3" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
          <button
            type="button"
            className="rounded p-1 text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-white/10"
            aria-label="Close compose"
          >
            <X className="size-4" />
          </button>
        </div>
      </header>

      <div className="space-y-2 border-b border-neutral-200 px-3 py-2 dark:border-hub-border">
        <input
          placeholder="To"
          className="h-8 w-full rounded border border-transparent bg-transparent px-1 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-300 dark:focus:border-white/20"
        />
        <input
          placeholder="Subject"
          className="h-8 w-full rounded border border-transparent bg-transparent px-1 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-300 dark:focus:border-white/20"
        />
      </div>

      <textarea
        placeholder="Write your message..."
        className={cn(
          "min-h-[120px] flex-1 resize-none bg-transparent px-4 py-3 text-sm outline-none placeholder:text-neutral-400",
          compact && "min-h-[100px]",
        )}
      />

      <footer className="flex items-center justify-between border-t border-neutral-200 px-3 py-2 dark:border-hub-border">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
        >
          <Send className="size-3.5" />
          Send
        </button>
        <button
          type="button"
          className="rounded p-1.5 text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-white/10"
          aria-label="Attach file"
        >
          <Paperclip className="size-4" />
        </button>
      </footer>
    </section>
  );
}
