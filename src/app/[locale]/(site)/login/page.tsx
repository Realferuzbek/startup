import { setRequestLocale } from "next-intl/server";
import { LoginForm } from "@/features/auth/components/login-form";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string; error?: string }>;
};

export default async function LoginPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { next, error } = await searchParams;

  return (
    <main className="grid min-h-[70vh] place-items-center px-4 py-16">
      <div className="w-full max-w-sm">
        <LoginForm locale={locale} next={next} hasError={Boolean(error)} />
      </div>
    </main>
  );
}
