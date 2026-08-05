import { Skeleton } from "@/components/ui/skeleton";

// The post/edit form's shape: a heading, then four stacked sections — the map
// block is the tall one — and a submit. Shared by both routes' loading files so
// they cannot drift from each other.
export function PostFormSkeleton() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-10 px-4 py-8 md:px-6">
      <Skeleton className="h-9 w-56" />

      <section className="flex flex-col gap-4">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </section>

      <section className="flex flex-col gap-4">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/3] w-full" />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <div className="flex gap-3">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-28" />
        </div>
        <Skeleton className="h-10 w-full" />
      </section>

      <Skeleton className="h-10 w-40" />
    </main>
  );
}
