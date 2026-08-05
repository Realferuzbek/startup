import { Skeleton } from "@/components/ui/skeleton";

// Covers the admin overview and its nested queue routes.
export default function AdminLoading() {
  return (
    <main className="mx-auto max-w-[1200px] px-4 py-8 md:px-6">
      <Skeleton className="mb-6 h-9 w-48" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="border-rule flex flex-col gap-2 rounded-md border p-4"
          >
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
    </main>
  );
}
