import { Skeleton } from "@/components/ui/skeleton";

// Mirrors the detail page: gallery on the left, the title/price/spec/contact
// column on the right, stacking below lg.
export default function ListingDetailLoading() {
  return (
    <main className="mx-auto max-w-[1200px] px-4 py-8 md:px-6">
      <div className="lg:grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-8">
        <div className="flex flex-col gap-2">
          <Skeleton className="aspect-[4/3] w-full" />
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/3] w-full" />
            ))}
          </div>
        </div>

        <aside className="mt-6 flex flex-col gap-5 lg:mt-0">
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-5 w-2/3" />
          <div className="border-rule grid grid-cols-2 gap-x-4 gap-y-3 border-t pt-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-20" />
              </div>
            ))}
          </div>
          <Skeleton className="h-24 w-full" />
        </aside>
      </div>
    </main>
  );
}
