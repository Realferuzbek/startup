import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function NotAuthorizedPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  const tn = await getTranslations("nav");

  return (
    <main className="grid min-h-[70vh] place-items-center px-4 py-16">
      <Card className="flex w-full max-w-md flex-col items-center gap-6 p-8 text-center">
        <p className="text-body text-ink">{t("notAuthorized")}</p>
        <Link href="/" className={buttonVariants({ variant: "secondary" })}>
          {tn("feed")}
        </Link>
      </Card>
    </main>
  );
}
