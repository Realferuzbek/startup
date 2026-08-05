import { getTranslations } from "next-intl/server";
import { signOut } from "@/features/auth/actions";
import { SubmitButton } from "@/components/ui/submit-button";

// Sign-out control. A plain form posting to the signOut server action — works
// without client JS. The button is a client component only so useFormStatus can
// show the sign-out in flight and block a second submit.
export async function SignOutButton() {
  const t = await getTranslations("auth");

  return (
    <form action={signOut}>
      <SubmitButton variant="ghost" size="sm">
        {t("signOut")}
      </SubmitButton>
    </form>
  );
}
