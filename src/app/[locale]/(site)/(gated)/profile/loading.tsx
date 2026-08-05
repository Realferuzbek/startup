import { Skeleton } from "@/components/ui/skeleton";

function CardGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="border-rule flex flex-col overflow-hidden rounded-md border"
        >
          <Skeleton className="aspect-[4/3] w-full rounded-none" />
          <div className="flex flex-col gap-3 p-4">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
      ))}
    </div>
  );
}

// The profile hub's three sections: Uylarim, Saqlanganlar, Sozlamalar.
export default function ProfileLoading() {
  return (
    <main className="mx-auto flex max-w-[1200px] flex-col gap-12 px-4 py-8 md:px-6">
      <Skeleton className="h-9 w-32" />

      <section className="flex flex-col gap-4">
        <Skeleton className="h-7 w-28" />
        <CardGrid />
      </section>

      <section className="flex flex-col gap-4">
        <Skeleton className="h-7 w-40" />
        <CardGrid />
      </section>

      <section className="flex flex-col gap-4">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-10 w-full max-w-lg" />
        <Skeleton className="h-10 w-full max-w-lg" />
        <Skeleton className="h-10 w-40" />
      </section>
    </main>
  );
}
