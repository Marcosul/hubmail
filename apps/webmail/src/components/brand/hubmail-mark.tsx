import { cn } from "@/lib/utils";
import Image from "next/image";

/**
 * `hubmail-mark-dark.svg` / `hubmail-mark-light.svg` are glyph-only: no background shape in the SVG
 * (transparent canvas). Use them on a solid surface (e.g. `bg-white`, `bg-neutral-900`) so contrast stays correct.
 */
/** Matches `viewBox` width/height of `hubmail-mark-*.svg` (44×57). */
const MARK_W = 44;
const MARK_H = 57;

type MarkClassName = { className?: string };

/** Dark glyphs on transparent canvas — place on a light solid background. */
export function HubMailMarkOnLightSurface({ className }: MarkClassName) {
  return (
    <Image
      src="/hubmail-mark-dark.svg"
      alt="HubMail Mark"
      width={MARK_W}
      height={MARK_H}
      className={cn("object-contain", className)}
      priority
    />
  );
}

/** Light glyphs on transparent canvas — place on a dark solid background. */
export function HubMailMarkOnDarkSurface({ className }: MarkClassName) {
  return (
    <Image
      src="/hubmail-mark-light.svg"
      alt="HubMail Mark"
      width={MARK_W}
      height={MARK_H}
      className={cn("object-contain", className)}
      priority
    />
  );
}

/**
 * Sidebar / mobile bar: light theme → white tile + `hubmail-mark-dark.svg`; dark theme → transparent tile +
 * `hubmail-mark-light.svg` on the sidebar surface.
 */
export function HubMailMarkThemedTile({ className }: MarkClassName) {
  return (
    <>
      <HubMailMarkOnLightSurface className={cn("dark:hidden", className)} />
      <HubMailMarkOnDarkSurface className={cn("hidden dark:block", className)} />
    </>
  );
}
