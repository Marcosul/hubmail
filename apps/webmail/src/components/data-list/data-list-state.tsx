"use client";

import { Loader2 } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";

type EmptyProps = {
  icon?: ComponentType<{ className?: string }>;
  title?: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function DataListEmpty({ icon: Icon, title, description, action, className }: EmptyProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-4 py-16 text-center",
        className,
      )}
    >
      {Icon ? (
        <Icon className="mb-4 size-12 text-neutral-300 dark:text-neutral-600" aria-hidden />
      ) : null}
      {title ? (
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">{title}</h2>
      ) : null}
      {description ? (
        <div className="mt-2 max-w-md text-sm text-neutral-500 dark:text-neutral-400">
          {description}
        </div>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function DataListLoading({ label = "A carregar..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 px-4 py-12 text-sm text-neutral-500">
      <Loader2 className="size-4 animate-spin" />
      <span>{label}</span>
    </div>
  );
}

export function DataListError({ label }: { label: string }) {
  return <div className="px-4 py-12 text-center text-sm text-red-500">{label}</div>;
}
