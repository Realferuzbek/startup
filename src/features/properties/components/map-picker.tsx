"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

// ── Minimal typings for the Yandex JS API v3 global (only what we use) ────────
// The API's coordinate arrays are ALWAYS [longitude, latitude].
type LngLat = [number, number];

interface YMapEntity {
  update?: (props: { coordinates: LngLat }) => void;
}
interface YMapInstance {
  addChild: (child: unknown) => YMapInstance;
  destroy: () => void;
}
interface Ymaps3 {
  ready: Promise<void>;
  YMap: new (
    element: HTMLElement,
    props: { location: { center: LngLat; zoom: number } },
  ) => YMapInstance;
  YMapDefaultSchemeLayer: new () => unknown;
  YMapDefaultFeaturesLayer: new () => unknown;
  YMapMarker: new (
    props: {
      coordinates: LngLat;
      draggable?: boolean;
      onDragEnd?: (coordinates: LngLat) => void;
    },
    element?: HTMLElement,
  ) => YMapEntity;
  YMapListener: new (props: {
    layer: string;
    onClick?: (object: unknown, event: { coordinates: LngLat }) => void;
  }) => unknown;
}

declare global {
  interface Window {
    ymaps3?: Ymaps3;
  }
}

// Tashkent center as [longitude, latitude].
const TASHKENT_CENTER: LngLat = [69.279, 41.311];
const CITY_ZOOM = 11;
// Edit mode opens zoomed to building level on the saved pin so the operator can
// confirm it is on the right building.
const BUILDING_ZOOM = 17;

// Load the Yandex Maps v3 script exactly once, client-side. It is never part of
// any JS bundle — it is injected at runtime and only on pages that render a map.
let loaderPromise: Promise<void> | null = null;
function loadYmaps3(apiKey: string, lang: string): Promise<void> {
  if (typeof window !== "undefined" && window.ymaps3) {
    return Promise.resolve();
  }
  if (loaderPromise) {
    return loaderPromise;
  }
  loaderPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    // The API key is public by design (do not log it).
    script.src = `https://api-maps.yandex.ru/v3/?apikey=${encodeURIComponent(apiKey)}&lang=${lang}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loaderPromise = null;
      reject(new Error("failed to load Yandex Maps"));
    };
    document.head.appendChild(script);
  });
  return loaderPromise;
}

export type Coordinate = { latitude: number; longitude: number };

type Props = {
  value?: Coordinate | null;
  onChange: (coordinate: Coordinate) => void;
  locale: string;
};

export function MapPicker({ value, onChange, locale }: Props) {
  const t = useTranslations("property");
  const containerRef = useRef<HTMLDivElement>(null);
  // Keep the latest onChange without re-initializing the map.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let map: YMapInstance | null = null;

    const apiKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY;
    const container = containerRef.current;
    if (!apiKey || !container) {
      setFailed(true);
      return;
    }

    // Yandex has no Uzbek map locale; Russian labels for ru, Latin otherwise.
    const lang = locale === "ru" ? "ru_RU" : "en_US";
    // Initial marker/center as [lng, lat]; `value` arrives as {lat, lng}.
    const initial: LngLat = value
      ? [value.longitude, value.latitude]
      : TASHKENT_CENTER;
    // A provided coordinate (edit mode) opens at building level; a fresh pin
    // stays at city zoom.
    const zoom = value ? BUILDING_ZOOM : CITY_ZOOM;

    loadYmaps3(apiKey, lang)
      .then(async () => {
        const ymaps3 = window.ymaps3;
        if (!ymaps3) {
          throw new Error("ymaps3 unavailable");
        }
        await ymaps3.ready;
        if (cancelled) {
          return;
        }

        map = new ymaps3.YMap(container, {
          location: { center: initial, zoom },
        });
        map.addChild(new ymaps3.YMapDefaultSchemeLayer());
        map.addChild(new ymaps3.YMapDefaultFeaturesLayer());

        // Minimal, functional marker element.
        const el = document.createElement("div");
        el.style.cssText =
          "width:18px;height:18px;border-radius:50%;background:#2563eb;" +
          "border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.35);" +
          "transform:translate(-50%,-50%);cursor:grab";

        const marker = new ymaps3.YMapMarker(
          {
            coordinates: initial,
            draggable: true,
            // Drag ends deliver the new [lng, lat]; emit {lat, lng}.
            onDragEnd: ([lng, lat]) =>
              onChangeRef.current({ latitude: lat, longitude: lng }),
          },
          el,
        );
        map.addChild(marker);

        const listener = new ymaps3.YMapListener({
          layer: "any",
          onClick: (_object, event) => {
            // Click coordinates arrive as [lng, lat]; move the marker and emit
            // {lat, lng}.
            const [lng, lat] = event.coordinates;
            marker.update?.({ coordinates: [lng, lat] });
            onChangeRef.current({ latitude: lat, longitude: lng });
          },
        });
        map.addChild(listener);
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
        }
      });

    return () => {
      cancelled = true;
      map?.destroy();
    };
    // Initialize once per locale; later coordinate changes are driven by the
    // user interacting with the marker, not by re-creating the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  if (failed) {
    return (
      <div className="border-rule bg-surface text-ink-secondary text-small flex h-64 items-center justify-center rounded-md border p-4 text-center">
        {t("mapLoadError")}
      </div>
    );
  }

  return (
    <div>
      <p className="text-small text-ink-secondary mb-2">{t("mapHint")}</p>
      <div
        ref={containerRef}
        className="border-rule h-64 w-full overflow-hidden rounded-md border"
      />
    </div>
  );
}
