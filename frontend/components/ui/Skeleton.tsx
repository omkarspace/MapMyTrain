"use client";

interface SkeletonProps {
  className?: string;
}

function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={className}
      style={{
        animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        backgroundColor: "var(--color-surface-alt)",
        borderRadius: "var(--radius-sm)",
      }}
    />
  );
}

export function TrainCardSkeleton() {
  return (
    <div
      className="p-3 rounded-lg"
      style={{
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border)",
      }}
    >
      <div className="flex items-center gap-3">
        <Skeleton className="w-9 h-9 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-2.5 w-1/2" />
        </div>
        <Skeleton className="w-14 h-5 rounded-full shrink-0" />
      </div>
    </div>
  );
}

export function TrainListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <TrainCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function AnalyticsSkeleton() {
  return (
    <div
      className="rounded-lg p-3 mb-4"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      <Skeleton className="h-3 w-24 mb-3" />
      <div className="grid grid-cols-2 gap-2">
        <div
          className="rounded-lg p-2"
          style={{ backgroundColor: "var(--color-surface)" }}
        >
          <Skeleton className="h-2.5 w-16 mb-2" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div
          className="rounded-lg p-2"
          style={{ backgroundColor: "var(--color-surface)" }}
        >
          <Skeleton className="h-2.5 w-20 mb-2" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    </div>
  );
}

export function ScheduleSkeleton() {
  return (
    <div className="space-y-2 p-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="grid grid-cols-4 gap-2">
          <Skeleton className="h-2.5 w-14" />
          <Skeleton className="h-2.5 w-10" />
          <Skeleton className="h-2.5 w-10" />
          <Skeleton className="h-2.5 w-6" />
        </div>
      ))}
    </div>
  );
}
