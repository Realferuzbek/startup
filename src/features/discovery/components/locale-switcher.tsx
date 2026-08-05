"use client";

import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

// Switches locale while preserving the current path AND query string.
export function LocaleSwitcher({ current }: { current: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function switchTo(locale: string) {
    const qs = searchParams.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { locale });
  }

  return (
    <div className="flex gap-1">
      {routing.locales.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => switchTo(l)}
          disabled={l === current}
          className="rounded border px-2 py-0.5 text-sm disabled:font-semibold"
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
