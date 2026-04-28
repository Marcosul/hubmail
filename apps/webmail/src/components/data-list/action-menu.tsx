"use client";

import { MoreVertical } from "lucide-react";
import { useEffect, useRef, useState, type ComponentType } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export type ActionMenuItem = {
  key: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  /** Renders a divider above this item. */
  separatorAbove?: boolean;
};

type Props = {
  items: ActionMenuItem[];
  ariaLabel?: string;
  /** Width in px used to clamp menu within the viewport. Default 208. */
  menuWidth?: number;
  triggerClassName?: string;
};

export function ActionMenu({
  items,
  ariaLabel = "Ações",
  menuWidth = 208,
  triggerClassName,
}: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node | null;
      if (!target) return;
      if (menuRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function handleViewport() {
      setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("scroll", handleViewport, true);
    window.addEventListener("resize", handleViewport);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("scroll", handleViewport, true);
      window.removeEventListener("resize", handleViewport);
    };
  }, [open]);

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const left = Math.max(
      8,
      Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8),
    );
    const top = rect.bottom + 6;
    setPos({ top, left });
    setOpen(true);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={cn(
          "inline-flex items-center justify-center rounded p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-white/10 dark:hover:text-neutral-200",
          triggerClassName,
        )}
      >
        <MoreVertical className="size-4" />
      </button>
      {open && pos && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              className="fixed z-50 min-w-52 overflow-hidden rounded-md border border-neutral-200 bg-white py-1 shadow-lg dark:border-hub-border dark:bg-[#1a1a1a]"
              style={{ top: pos.top, left: pos.left, width: menuWidth }}
              onClick={(e) => e.stopPropagation()}
            >
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.key}>
                    {item.separatorAbove ? (
                      <div className="my-1 border-t border-neutral-200 dark:border-hub-border" />
                    ) : null}
                    <button
                      type="button"
                      role="menuitem"
                      disabled={item.disabled}
                      onClick={() => {
                        setOpen(false);
                        item.onClick();
                      }}
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-40",
                        item.danger
                          ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                          : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-white/5",
                      )}
                    >
                      {Icon ? <Icon className="size-4 shrink-0" /> : null}
                      <span className="truncate">{item.label}</span>
                    </button>
                  </div>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
