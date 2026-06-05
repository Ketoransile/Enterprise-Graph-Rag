"use client";

import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-neutral-200/80 dark:bg-neutral-900",
        className,
      )}
    />
  );
}

export function PageSkeleton() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="border-b border-neutral-200 pb-5 dark:border-neutral-800">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-3 h-9 w-64" />
        <Skeleton className="mt-3 h-4 w-full max-w-xl" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-black"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-3 h-8 w-20" />
              </div>
              <Skeleton className="h-10 w-10 rounded-md" />
            </div>
            <Skeleton className="mt-5 h-4 w-full" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <PanelSkeleton rows={8} />
        <PanelSkeleton rows={5} />
      </div>
      <PanelSkeleton rows={6} />
    </div>
  );
}

export function TableSkeleton({ rows = 8, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-black">
      <div className="border-b border-neutral-100 p-4 dark:border-neutral-900">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="mt-2 h-3 w-52" />
      </div>
      <div className="divide-y divide-neutral-100 dark:divide-neutral-900">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="grid gap-4 p-4"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columns }).map((__, columnIndex) => (
              <Skeleton
                key={columnIndex}
                className={cn("h-4", columnIndex === 0 ? "w-full" : "w-3/4")}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function PanelSkeleton({ rows }: { rows: number }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-black">
      <div className="border-b border-neutral-100 p-5 dark:border-neutral-900">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-2 h-3 w-64" />
      </div>
      <div className="space-y-3 p-5">
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton
            key={index}
            className={cn("h-4", index % 3 === 0 ? "w-full" : index % 3 === 1 ? "w-5/6" : "w-2/3")}
          />
        ))}
      </div>
    </div>
  );
}
