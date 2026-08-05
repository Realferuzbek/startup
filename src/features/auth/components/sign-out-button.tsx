import { getTranslations } from "next-intl/server";
import { signOut } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";

// Sign-out control for authenticated layouts. A plain form posting to the
// signOut server action — works without client JS.
export async function SignOutButton() {
  const t = await getTranslations("auth");

  return (
    <form action={signOut}>
      <Button type="submit" variant="ghost" size="sm">
        {t("signOut")}
      </Button>
    </form>
  );
}
