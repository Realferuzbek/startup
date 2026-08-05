import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { plexSans, plexMono } from "@/lib/fonts";
import "../globals.css";

export const metadata: Metadata = {
  title: "Makleer",
  description: "Rental marketplace for Uzbekistan",
};

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

// Pre-render the locale layout for every configured locale.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// This is the root layout: it owns <html> and <body>. There is no
// src/app/layout.tsx because every route lives under [locale].
export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${plexSans.variable} ${plexMono.variable}`}>
      <body className="min-h-screen antialiased">
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
