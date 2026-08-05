import { Skeleton } from "@/components/ui/skeleton";

// The feed's shape: compact filter bar, result count, card grid. This is also
// the fallback for the few sibling routes with no closer loading file
// (/login, /not-authorized, /design), where a card grid still reads as "content
// on its way" rather than as anything misleading.
export default function SiteLoading() {
  return (
    <main className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 py-6 md:px-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Skeleton className="h-10 flex-1" />
        <div className="flex shrink-0 gap-2">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>

      <Skeleton className="h-5 w-24" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="border-rule flex flex-col gap-2 rounded-md border p-2"
          >
            <Skeleton className="aspect-[4/3] w-full" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ))}
      </div>
    </main>
  );
}
