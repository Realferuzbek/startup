import { redirect } from "next/navigation";

type Props = { params: Promise<{ locale: string; id: string }> };

// The property and listing edit forms merged into /edit/[propertyId]. A static
// segment outranks the sibling dynamic one, so this stub and the real route
// coexist.
export default async function LegacyEditPropertyPage({ params }: Props) {
  const { locale, id } = await params;
  redirect(`/${locale}/edit/${id}`);
}
