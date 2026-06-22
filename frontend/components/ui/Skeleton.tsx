"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse bg-slate-200 dark:bg-slate-700 rounded",
        className
      )}
    />
  );
}

export function TrainCardSkeleton() {
  return (
    <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-3">
        <Skeleton className="w-12 h-12 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="w-16 h-6 rounded-full" />
      </div>
    </div>
  );
}

export function TrainListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <TrainCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function AnalyticsSkeleton() {
  return (
    <div className="bg-slate-100 dark:bg-slate-800/50 rounded-lg p-3 mb-4">
      <Skeleton className="h-3 w-24 mb-3" />
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-slate-900/50 rounded-lg p-2">
          <Skeleton className="h-3 w-16 mb-2" />
          <Skeleton className="h-5 w-20" />
        </div>
        <div className="bg-white dark:bg-slate-900/50 rounded-lg p-2">
          <Skeleton className="h-3 w-20 mb-2" />
          <Skeleton className="h-5 w-16" />
        </div>
      </div>
    </div>
  );
}

export function ScheduleSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="grid grid-cols-4 gap-2 px-3 py-2">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-3 w-8" />
        </div>
      ))}
    </div>
  );
}
